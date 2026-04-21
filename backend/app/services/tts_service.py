import base64
import io
import edge_tts
from app.config import settings


async def text_to_speech_base64(text: str) -> str:
    """
    Converts text → Edge TTS neural audio → base64 string.
    Returns "" on failure (non-fatal — text still shows in chat).
    """
    try:
        # Clean text before sending to TTS
        clean = text.split("QUALIFICATION_DATA:")[0].strip()
        for sym in ["**", "__", "*", "_", "#", "```"]:
            clean = clean.replace(sym, "")
        if not clean:
            return ""

        communicate = edge_tts.Communicate(
            text=clean,
            voice=settings.EDGE_TTS_VOICE,
            rate=settings.EDGE_TTS_RATE,
            pitch=settings.EDGE_TTS_PITCH,
        )

        buf = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buf.write(chunk["data"])

        audio_bytes = buf.getvalue()
        if not audio_bytes:
            return ""

        return base64.b64encode(audio_bytes).decode("utf-8")

    except Exception as e:
        print(f"⚠️  Edge TTS error (non-fatal): {e}")
        return ""