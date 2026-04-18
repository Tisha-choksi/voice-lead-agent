# ─────────────────────────────────────────────────────────────────
# FILE PATH: voice-lead-agent/backend/app/services/groq_service.py
#
# WHY THIS FILE EXISTS:
#   This is the ONLY file that imports and talks to the Groq SDK.
#   All LLM communication is contained here.
#
#   If you ever want to switch from Groq to OpenAI, or add a fallback
#   model, you change only this file. Routes and qualifiers don't care
#   which LLM provider you use — they just call generate_response().
#
# HOW GROQ WORKS:
#   Groq is a cloud service that runs open-source LLMs (like LLaMA-3)
#   on custom hardware (LPUs) that are extremely fast.
#   Free tier gives you: ~14,400 requests/day on LLaMA-3.3-70B
#   Average response time: ~0.5-1 second (much faster than OpenAI)
#
# API KEY:
#   Get yours free at https://console.groq.com
#   Set it in backend/.env as GROQ_API_KEY=gsk_xxxxx
# ─────────────────────────────────────────────────────────────────

from groq import Groq
from app.config import settings
from app.services.prompt import build_messages


# ── Groq client (module-level singleton) ─────────────────────────
#
# WHY module-level (not inside the function):
#   Creating a Groq() client is slightly expensive — it sets up
#   HTTP connection pools and loads the API key.
#   By creating it once at module import time, every subsequent call
#   to generate_response() reuses the same client object.
#
#   This is the same pattern used by the official Groq docs.
#
# The client reads GROQ_API_KEY from the environment automatically
# (the Groq SDK checks os.environ["GROQ_API_KEY"]).
# We pass it explicitly for clarity and easier debugging.
_client = Groq(api_key=settings.GROQ_API_KEY)


# ── Main function: generate_response ─────────────────────────────
#
# Takes the user's message + conversation history,
# sends it to LLaMA-3.3-70B via Groq, returns the raw text response.
#
# Returns the FULL raw response including the QUALIFICATION_DATA block.
# It's qualifier.py's job to split those apart — not this function's.
# Single Responsibility Principle: this function ONLY talks to the LLM.
#
# Parameters:
#   current_message:      What the user just said (plain text from STT)
#   conversation_history: List of {"role": ..., "content": ...} dicts
#
# Returns:
#   The full LLM response string, e.g.:
#   "Hello! I'm Aria. What are you looking for today?\n\nQUALIFICATION_DATA: {...}"
async def generate_response(
    current_message: str,
    conversation_history: list[dict],
) -> str:
    # Build the messages array with system prompt + history + current message
    messages = build_messages(current_message, conversation_history)

    # ── Call the Groq API ─────────────────────────────────────────
    #
    # model:       Which LLM to use (from settings, default: llama-3.3-70b-versatile)
    # messages:    The full conversation context
    # temperature: Randomness (0.7 = natural but not erratic, good for sales chat)
    # max_tokens:  Cap the response length (300 tokens ≈ 3-4 sentences, ideal for TTS)
    #
    # WHY max_tokens matters:
    #   LLMs bill by token. Groq free tier has daily token limits.
    #   A response of 300 tokens is also short enough for TTS to sound
    #   natural — nobody wants to listen to a 2-minute AI monologue.
    #
    # NOTE: The Groq SDK's chat.completions.create() is synchronous.
    # We use it inside an async function — this is fine for short calls
    # but for high traffic, consider using asyncio.to_thread() to avoid
    # blocking the event loop. For a prototype, this is perfectly fine.
    completion = _client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=messages,  # type: ignore[arg-type]
        temperature=settings.GROQ_TEMPERATURE,
        max_tokens=settings.GROQ_MAX_TOKENS,
    )

    # ── Extract the text response ─────────────────────────────────
    #
    # completion.choices is a list (in case you request multiple responses).
    # We always request 1 (the default), so choices[0] is the response.
    # .message.content is the raw text string from the LLM.
    raw_response = completion.choices[0].message.content or ""

    return raw_response


# ── Token usage logger (optional, for debugging) ─────────────────
#
# Groq returns usage stats: prompt_tokens, completion_tokens, total_tokens.
# Useful to track against your free tier limits.
# Called optionally in generate_response_with_stats() below.
def log_token_usage(completion) -> None:
    usage = completion.usage
    if usage and settings.is_development:
        print(
            f"   Tokens — prompt: {usage.prompt_tokens}, "
            f"completion: {usage.completion_tokens}, "
            f"total: {usage.total_tokens}"
        )


# ── Extended version with token logging ──────────────────────────
#
# Same as generate_response() but logs token usage in development.
# Swap the call in chat.py if you want to track token consumption.
async def generate_response_with_stats(
    current_message: str,
    conversation_history: list[dict],
) -> str:
    messages = build_messages(current_message, conversation_history)

    completion = _client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=messages,  # type: ignore[arg-type]
        temperature=settings.GROQ_TEMPERATURE,
        max_tokens=settings.GROQ_MAX_TOKENS,
    )

    log_token_usage(completion)
    return completion.choices[0].message.content or ""