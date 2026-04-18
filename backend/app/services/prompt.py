# ─────────────────────────────────────────────────────────────────
# FILE PATH: voice-lead-agent/backend/app/services/prompt.py
#
# WHY THIS FILE EXISTS:
#   The system prompt is the most important piece of the entire app.
#   It defines WHO Aria is, HOW she speaks, WHAT she asks, and
#   HOW she formats her output for the qualifier to parse.
#
#   Keeping it in its own file means:
#   ✓ Non-developers can edit Aria's personality without touching logic
#   ✓ You can A/B test different prompts by swapping this file
#   ✓ groq_service.py stays clean — no giant strings embedded in logic
#
# PROMPT ENGINEERING NOTES (important for learning):
#   A good system prompt has 5 parts:
#   1. PERSONA    — who the AI is
#   2. GOAL       — what it's trying to accomplish
#   3. RULES      — how it should behave (constraints)
#   4. FLOW       — step-by-step instructions for the conversation
#   5. OUTPUT FORMAT — exactly how to structure the response
#
#   Part 5 is critical here: we need the LLM to embed a JSON block
#   in its response so qualifier.py can extract lead data without
#   a separate API call (saves tokens, saves latency, saves money).
# ─────────────────────────────────────────────────────────────────

from app.config import settings
# ── Main system prompt ────────────────────────────────────────────
#
# This is an f-string so we can inject AGENT_NAME and AGENT_COMPANY
# from environment variables (set in .env).
# Customize Aria's name and company without touching this code.
def get_system_prompt() -> str:
    return f"""You are {settings.AGENT_NAME}, a warm, professional AI sales assistant for {settings.AGENT_COMPANY}.

Your GOAL is to have a natural voice conversation to understand the customer's needs and qualify them as a business lead.

═══════════════════════════════════════════
CONVERSATION FLOW — follow this order naturally:
═══════════════════════════════════════════
1. GREET  → Introduce yourself warmly, ask what brings them here
2. NEED   → Understand what they're looking for and their use case
3. BUDGET → Ask tactfully: "Do you have a budget in mind for this?"
4. TIMELINE → "When are you looking to get started?"
5. AUTHORITY → "Are you the decision-maker, or are others involved?"
6. CLOSE  → Offer a follow-up: "I'd love to have someone reach out to you"

═══════════════════════════════════════════
CONVERSATION RULES (strictly follow these):
═══════════════════════════════════════════
• Keep ALL responses under 2-3 sentences — this is a VOICE conversation
• Ask only ONE question per response — never stack multiple questions
• Be natural and human — not robotic or salesy
• If the user says goodbye/thanks, wrap up gracefully with a closing statement
• Never mention "lead scoring", "qualification", or any internal business terms
• If the user asks something off-topic, answer briefly then redirect

═══════════════════════════════════════════
LEAD SCORING RULES (internal — never mention to user):
═══════════════════════════════════════════
Score HOT  → Clear specific need + budget range mentioned + urgent timeline (within 1 month)
Score WARM → Interest shown + budget vague OR timeline > 1 month OR just exploring with intent
Score COLD → Just browsing, no budget, no urgency, or unclear need

═══════════════════════════════════════════
OUTPUT FORMAT — CRITICAL, follow exactly:
═══════════════════════════════════════════
After EVERY response, on a NEW LINE, output this exact block:

QUALIFICATION_DATA: {{"intent": "brief description of what user wants", "budget": "amount mentioned or unknown", "timeline": "timeframe mentioned or unknown", "is_decision_maker": true/false/unknown, "lead_score": "HOT/WARM/COLD", "conversation_stage": "greeting/discovery/qualification/closing"}}

IMPORTANT:
- The QUALIFICATION_DATA line must be on its own line, AFTER your spoken reply
- Use double quotes inside the JSON (not single quotes)
- is_decision_maker must be exactly: true, false, or the string "unknown"
- Do NOT put QUALIFICATION_DATA in your spoken response — it's hidden from the user
- Always update the JSON based on what you've learned so far in the conversation"""
# ── Prompt builder ────────────────────────────────────────────────
#
# Assembles the full messages array that gets sent to the Groq API.
#
# The Groq API (like OpenAI) uses a "messages" format:
#   [
#     {{ "role": "system",    "content": "You are Aria..." }},
#     {{ "role": "user",      "content": "Hi, I need diamonds" }},
#     {{ "role": "assistant", "content": "Hello! I'm Aria..." }},
#     {{ "role": "user",      "content": "My budget is $50k" }},
#   ]
#
# WHY include conversation_history:
#   LLMs are STATELESS — each API call has no memory of previous calls.
#   To make Aria "remember" the conversation, we re-send the history
#   on every single call. The LLM reads it and responds in context.
#
#   We cap history at 10 messages (done in api.ts on the frontend)
#   to prevent token limit errors on the free tier.
def build_messages(
    current_message: str,
    conversation_history: list[dict],
) -> list[dict]:
    messages = [
        {
            "role": "system",
            "content": get_system_prompt(),
        }
    ]
    # Add the conversation so far (last N messages from frontend)
    for msg in conversation_history:
        messages.append({
            "role": msg["role"],       # "user" or "assistant"
            "content": msg["content"],
        })
    # Add the current user message at the end
    messages.append({
        "role": "user",
        "content": current_message,
    })
    return messages