# FILE PATH: voice-lead-agent/backend/app/routes/chat.py

import uuid
from fastapi import APIRouter, HTTPException

from app.models import ChatRequest, ChatResponse
from app.services.groq_service import generate_response
from app.services.qualifier import parse_llm_response
from app import database

router = APIRouter()


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Send a message to Aria",
)
async def chat_endpoint(request: ChatRequest) -> ChatResponse:

    # Step 1: Session management
    session_id = request.session_id or str(uuid.uuid4())

    # Step 2: Call the LLM
    try:
        raw_response = await generate_response(
            current_message=request.message,
            conversation_history=[
                msg.model_dump() for msg in request.conversation_history
            ],
        )
    except Exception as e:
        print(f"❌ Groq API error: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"LLM service error: {str(e)}. Check your GROQ_API_KEY.",
        )

    # Step 3: Parse the LLM response
    aria_reply, qual_data = parse_llm_response(raw_response)

    # Step 4: Persist to database
    try:
        existing_lead = database.get_lead_by_session(session_id)

        if not existing_lead:
            database.save_lead(
                session_id=session_id,
                first_message=request.message,
                lead_score=qual_data.lead_score,
            )
        else:
            database.update_lead(
                session_id=session_id,
                lead_score=qual_data.lead_score,
                qualification_data=qual_data.model_dump(),
            )

        database.save_message(session_id, "user", request.message)
        database.save_message(session_id, "assistant", aria_reply)

    except Exception as db_error:
        print(f"⚠️  Database error (non-fatal): {db_error}")

    # Step 5: Return the response
    return ChatResponse(
        reply=aria_reply,
        session_id=session_id,
        lead_score=qual_data.lead_score,
        qualification_data=qual_data,
        conversation_stage=qual_data.conversation_stage,
    )