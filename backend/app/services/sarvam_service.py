import httpx
import json
from typing import AsyncGenerator
from app.config import settings
from app.services.prompt import build_messages


async def stream_response(
    current_message: str,
    conversation_history: list[dict],
) -> AsyncGenerator[str, None]:
    """
    Streams Sarvam AI response token by token via SSE.
    Yields each text chunk as it arrives.
    """
    messages = build_messages(current_message, conversation_history)

    headers = {
        "Authorization": f"Bearer {settings.SARVAM_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": settings.SARVAM_MODEL,
        "messages": messages,
        "temperature": settings.SARVAM_TEMPERATURE,
        "max_tokens": settings.SARVAM_MAX_TOKENS,
        "stream": True,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream(
            "POST",
            f"{settings.SARVAM_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
        ) as response:

            if response.status_code != 200:
                error_body = await response.aread()
                raise RuntimeError(
                    f"Sarvam API error {response.status_code}: {error_body.decode()}"
                )

            async for line in response.aiter_lines():
                line = line.strip()
                if not line or not line.startswith("data:"):
                    continue

                data_str = line[len("data:"):].strip()
                if data_str == "[DONE]":
                    break

                try:
                    data  = json.loads(data_str)
                    token = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                    if token:
                        yield token
                except (json.JSONDecodeError, IndexError, KeyError):
                    continue


async def generate_response(
    current_message: str,
    conversation_history: list[dict],
) -> str:
    """Non-streaming — collects full response. Used for /chat fallback."""
    full = ""
    async for token in stream_response(current_message, conversation_history):
        full += token
    return full
