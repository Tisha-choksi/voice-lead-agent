# ─────────────────────────────────────────────────────────────────
# FILE PATH: voice-lead-agent/backend/app/models.py
#
# WHY THIS FILE EXISTS:
#   Pydantic models do THREE things automatically in FastAPI:
#
#   1. VALIDATION — If a request is missing `message` or sends
#      `session_id: 123` (int instead of str), FastAPI rejects it
#      with a clear 422 error before your code even runs.
#
#   2. SERIALIZATION — Python objects (dataclasses, dicts) are
#      automatically converted to/from JSON with correct types.
#
#   3. DOCUMENTATION — FastAPI reads these models and generates
#      interactive API docs at http://localhost:8000/docs
#      (Swagger UI) completely automatically — no extra work.
#
#   Every field here MUST match the TypeScript types in frontend/lib/types.ts
#   If they drift out of sync, you'll get silent runtime bugs.
# ─────────────────────────────────────────────────────────────────

from pydantic import BaseModel, Field
from typing import Optional, List, Literal, Union
from datetime import datetime


# ── 1. LEAD SCORE ────────────────────────────────────────────────
#
# Literal["HOT", "WARM", "COLD"] is Python's equivalent of
# TypeScript's union type: "HOT" | "WARM" | "COLD"
# Pydantic will reject any other string value.
LeadScoreType = Literal["HOT", "WARM", "COLD"]


# ── 2. CONVERSATION STAGE ────────────────────────────────────────
ConversationStageType = Literal[
    "greeting", "discovery", "qualification", "closing"
]


# ── 3. QUALIFICATION DATA ─────────────────────────────────────────
#
# This is extracted from the LLM's response in qualifier.py.
# The system prompt instructs Aria to append this JSON after every reply.
# qualifier.py parses it out and populates this model.
#
# Field(...) with description= appears in the auto-generated API docs.
# It's optional but makes the /docs page much more readable.
class QualificationData(BaseModel):
    intent: str = Field(default="unknown", description="What the user is looking for")
    budget: str = Field(default="unknown", description="Budget mentioned by the user")
    timeline: str = Field(default="unknown", description="When they want to proceed")
    is_decision_maker: Union[bool, str] = Field(
        default="unknown",
        description="Whether the user can make the buying decision"
    )
    lead_score: LeadScoreType = Field(
        default="COLD",
        description="HOT = urgent + budget, WARM = interested, COLD = exploring"
    )
    conversation_stage: ConversationStageType = Field(
        default="greeting",
        description="Current stage of the sales conversation"
    )


# ── 4. CONVERSATION MESSAGE ───────────────────────────────────────
#
# A single item in the conversation_history array sent by the frontend.
# Role is either "user" (human spoke) or "assistant" (Aria spoke).
#
# WHY "assistant" not "aria":
#   The Groq API (and OpenAI spec) requires role="assistant" for the
#   AI's turn. If you send role="aria", the API will reject it.
#   The frontend translates: aria messages → role: "assistant" before sending.
class ConversationMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

# ── 5. CHAT REQUEST ───────────────────────────────────────────────
#
# The body of POST /api/chat — what the frontend sends.
# Matches ChatRequest interface in frontend/lib/types.ts
#
# Optional[str] = None means the field can be absent or null.
# On the first message, the frontend sends session_id=null.
# The backend creates a new UUID and returns it.
class ChatRequest(BaseModel):
    message: str = Field(
        ...,  # ... means REQUIRED — no default value
        min_length=1,
        max_length=2000,
        description="The user's spoken message converted to text"
    )
    session_id: Optional[str] = Field(
        default=None,
        description="Null for new sessions, UUID string for existing ones"
    )
    conversation_history: List[ConversationMessage] = Field(
        default=[],
        max_length=20,  # Safety cap — don't let clients send huge history
        description="Last N messages for LLM context. Frontend caps at 10."
    )

# ── 6. CHAT RESPONSE ─────────────────────────────────────────────
#
# The body of POST /api/chat — what the backend returns.
# Matches ChatResponse interface in frontend/lib/types.ts
#
# Every field here must have a value — no Optionals.
# If the LLM fails to parse qualification data, the backend
# should return sensible defaults (handled in qualifier.py).
class ChatResponse(BaseModel):
    reply: str = Field(description="Aria's response — this is spoken via TTS")
    session_id: str = Field(description="UUID for this lead session")
    lead_score: LeadScoreType = Field(description="HOT / WARM / COLD")
    qualification_data: QualificationData
    conversation_stage: ConversationStageType

# ── 7. LEAD (database record) ─────────────────────────────────────
#
# Returned by GET /api/leads — one row from the SQLite leads table.
# Matches Lead interface in frontend/lib/types.ts
#
# qualification_data is stored as a JSON string in SQLite.
# The leads.py route converts it to a dict before returning.
class LeadRecord(BaseModel):
    id: int
    session_id: str
    first_message: str
    name: str = "Unknown"
    phone: Optional[str] = None
    email: Optional[str] = None
    lead_score: LeadScoreType = "COLD"
    qualification_data: Optional[Union[QualificationData, dict]] = None
    created_at: str  # ISO string from SQLite's datetime('now')
    updated_at: str

# ── 8. LEADS RESPONSE ─────────────────────────────────────────────
#
# The body of GET /api/leads
# Matches LeadsResponse interface in frontend/lib/types.ts
class LeadsResponse(BaseModel):
    leads: List[LeadRecord]
    total: int

# ── 9. LEAD STATS ─────────────────────────────────────────────────
#
# The body of GET /api/leads/stats
# Matches LeadStats interface in frontend/lib/types.ts
class LeadStats(BaseModel):
    total: int
    hot: int
    warm: int
    cold: int
# ── 10. HEALTH CHECK RESPONSE ────────────────────────────────────
#
# The body of GET / (root endpoint)
# Used by checkBackendHealth() in frontend/lib/api.ts
class HealthResponse(BaseModel):
    status: str