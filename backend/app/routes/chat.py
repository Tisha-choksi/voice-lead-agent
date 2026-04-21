import uuid
import json
import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.models import ChatRequest, ChatResponse
from app.services.sarvam_service import stream_response, generate_response
from app.services.qualifier import parse_llm_response
from app.services.tts_service import text_to_speech_base64
from app import database

router = APIRouter()


def sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


# ── SSE Streaming endpoint ────────────────────────────────────────
@router.post("/chat/stream")
async def chat_stream(request: ChatRequest) -> StreamingResponse:
    """
    SSE stream with 3 event types:
      token → live text chunk (typing effect)
      done  → full reply + qualification data
      audio → base64 MP3 from Edge TTS
    """
    session_id = request.session_id or str(uuid.uuid4())

    async def generate():
        full_response = ""

        # 1. Stream tokens from Sarvam
        try:
            async for token in stream_response(
                current_message=request.message,
                conversation_history=[m.model_dump() for m in request.conversation_history],
            ):
                full_response += token
                yield sse({"type": "token", "content": token})
                await asyncio.sleep(0)

        except Exception as e:
            yield sse({"type": "error", "message": str(e)})
            return

        # 2. Parse qualification data
        aria_reply, qual_data = parse_llm_response(full_response)

        # 3. Save to database
        try:
            if not database.get_lead_by_session(session_id):
                database.save_lead(session_id, request.message, qual_data.lead_score)
            else:
                database.update_lead(session_id, qual_data.lead_score, qual_data.model_dump())
            database.save_message(session_id, "user", request.message)
            database.save_message(session_id, "assistant", aria_reply)
        except Exception as db_err:
            print(f"⚠️  DB error: {db_err}")

        # 4. Send done event
        yield sse({
            "type":               "done",
            "reply":              aria_reply,
            "session_id":         session_id,
            "lead_score":         qual_data.lead_score,
            "conversation_stage": qual_data.conversation_stage,
            "qualification_data": qual_data.model_dump(),
        })

        # 5. Generate and send Edge TTS audio
        audio_b64 = await text_to_speech_base64(aria_reply)
        if audio_b64:
            yield sse({"type": "audio", "audio": audio_b64})

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Non-streaming fallback (for Swagger /docs testing) ───────────
@router.post("/chat", response_model=ChatResponse)
async def chat_sync(request: ChatRequest) -> ChatResponse:
    session_id = request.session_id or str(uuid.uuid4())

    try:
        raw = await generate_response(
            current_message=request.message,
            conversation_history=[m.model_dump() for m in request.conversation_history],
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    aria_reply, qual_data = parse_llm_response(raw)

    try:
        if not database.get_lead_by_session(session_id):
            database.save_lead(session_id, request.message, qual_data.lead_score)
        else:
            database.update_lead(session_id, qual_data.lead_score, qual_data.model_dump())
    except Exception as e:
        print(f"⚠️  DB error: {e}")

    return ChatResponse(
        reply=aria_reply,
        session_id=session_id,
        lead_score=qual_data.lead_score,
        qualification_data=qual_data,
        conversation_stage=qual_data.conversation_stage,
    )
