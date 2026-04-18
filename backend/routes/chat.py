# ─────────────────────────────────────────────────────────────────
# FILE PATH: voice-lead-agent/backend/app/routes/chat.py
#
# WHY THIS FILE EXISTS:
#   This defines POST /api/chat — the heart of the entire application.
#   Every spoken word from the user passes through this endpoint.
#
#   A route file should be THIN. Its only jobs are:
#   1. Receive the validated request (Pydantic handles validation)
#   2. Orchestrate the service calls (groq → qualifier → database)
#   3. Return the response
#
#   It should NOT contain: business logic, SQL, LLM prompt text.
#   Those live in services/ and database.py respectively.
#
# REQUEST FLOW for every user message:
#   Frontend (STT → text) → POST /api/chat
#     → groq_service.generate_response()   [calls LLaMA-3]
#     → qualifier.parse_llm_response()     [splits reply + JSON]
#     → database.save_lead() or update_lead()  [persist data]
#     ← returns ChatResponse
#   Frontend ← ChatResponse → (TTS speaks reply, UI updates score)
# ─────────────────────────────────────────────────────────────────

import uuid
from fastapi import APIRouter, HTTPException

from app.models import ChatRequest, ChatResponse
from app.services.groq_service import generate_response
from app.services.qualifier import parse_llm_response
from app import database


# ── Router ────────────────────────────────────────────────────────
#
# APIRouter is like a mini FastAPI app.
# We define routes on the router here, then in main.py we do:
#   app.include_router(chat_router, prefix="/api")
# This means the actual URL becomes: POST /api/chat
#
# WHY use routers instead of putting everything in main.py:
#   Separation of concerns — main.py stays small.
#   You can enable/disable entire route groups in one line.
#   Each route file is independently testable.
router = APIRouter()


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Send a message to Aria",
    description="Processes user speech (converted to text) through the LLM and returns Aria's response with lead qualification data.",
)
async def chat_endpoint(request: ChatRequest) -> ChatResponse:
    """
    Main conversation endpoint.

    The frontend calls this after every STT result.
    Returns Aria's spoken reply + updated lead qualification data.
    """

    # ── Step 1: Session management ────────────────────────────────
    #
    # If session_id is None → this is the first message of a new conversation.
    # Generate a UUID to identify this lead across all subsequent messages.
    #
    # If session_id is provided → this is a continuing conversation.
    # Use the same ID so the database record gets updated (not duplicated).
    #
    # uuid.uuid4() generates a random UUID like: "550e8400-e29b-41d4-a716-446655440000"
    # str() converts it to a string for JSON serialization and SQLite storage.
    session_id = request.session_id or str(uuid.uuid4())

    # ── Step 2: Call the LLM ──────────────────────────────────────
    #
    # This is the slowest step (~0.5-1 second on Groq).
    # We await it so FastAPI can handle other requests while waiting.
    #
    # On failure (network error, rate limit, invalid key), Groq raises
    # an exception. We catch it and return a 500 with a clear message.
    try:
        raw_response = await generate_response(
            current_message=request.message,
            conversation_history=[
                msg.model_dump() for msg in request.conversation_history
            ],
        )
    except Exception as e:
        # Log for debugging (visible in uvicorn terminal)
        print(f"❌ Groq API error: {e}")
        raise HTTPException(
            status_code=502,  # 502 Bad Gateway = upstream service failed
            detail=f"LLM service error: {str(e)}. Check your GROQ_API_KEY.",
        )

    # ── Step 3: Parse the LLM response ────────────────────────────
    #
    # The raw_response looks like:
    #   "Hi there! I'm Aria...\n\nQUALIFICATION_DATA: {...}"
    #
    # parse_llm_response() splits this into:
    #   aria_reply   = "Hi there! I'm Aria..."
    #   qual_data    = QualificationData(intent=..., lead_score=..., ...)
    #
    # This never raises an exception — qualifier.py always returns
    # safe defaults if the JSON is missing or malformed.
    aria_reply, qual_data = parse_llm_response(raw_response)

    # ── Step 4: Persist to database ───────────────────────────────
    #
    # Check if this session already has a lead record.
    # First message → create a new record.
    # Subsequent messages → update the existing record.
    #
    # We wrap in try/except so a database error doesn't break the
    # conversation — the user still gets Aria's reply even if
    # saving fails (degrade gracefully, log the error).
    try:
        existing_lead = database.get_lead_by_session(session_id)

        if not existing_lead:
            # First message — create the lead record
            database.save_lead(
                session_id=session_id,
                first_message=request.message,
                lead_score=qual_data.lead_score,
            )
        else:
            # Subsequent message — update with latest qualification data
            database.update_lead(
                session_id=session_id,
                lead_score=qual_data.lead_score,
                qualification_data=qual_data.model_dump(),
            )

        # Optionally save individual messages for audit trail
        # (comment these out if you want to reduce DB writes)
        database.save_message(session_id, "user", request.message)
        database.save_message(session_id, "assistant", aria_reply)

    except Exception as db_error:
        # Log but don't crash the request — conversation > data persistence
        print(f"⚠️  Database error (non-fatal): {db_error}")

    # ── Step 5: Return the response ───────────────────────────────
    #
    # FastAPI automatically serializes this Pydantic model to JSON.
    # The frontend receives it and:
    #   - Feeds aria_reply to the TTS engine → Aria speaks
    #   - Stores session_id in Zustand for the next message
    #   - Updates the lead badge (HOT/WARM/COLD)
    #   - Updates the qualification strip (intent, budget, timeline, stage)
    return ChatResponse(
        reply=aria_reply,
        session_id=session_id,
        lead_score=qual_data.lead_score,
        qualification_data=qual_data,
        conversation_stage=qual_data.conversation_stage,
    )