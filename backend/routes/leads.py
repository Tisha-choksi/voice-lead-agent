# ─────────────────────────────────────────────────────────────────
# FILE PATH: voice-lead-agent/backend/app/routes/leads.py
#
# WHY THIS FILE EXISTS:
#   Defines three endpoints for the Lead Dashboard:
#
#   GET  /api/leads        → all lead records (for the table)
#   GET  /api/leads/stats  → aggregated counts (for the stat cards)
#   DELETE /api/leads/{id} → remove a single lead
#
#   These are READ-only routes (plus one delete).
#   All writing happens in chat.py as conversations progress.
# ─────────────────────────────────────────────────────────────────

from fastapi import APIRouter, HTTPException
from app.models import LeadsResponse, LeadStats, LeadRecord
from app import database

router = APIRouter()


# ── GET /api/leads ────────────────────────────────────────────────
#
# Returns all leads, newest first.
# Called by the useLeads hook in the frontend dashboard.
#
# Response shape (matches LeadsResponse in frontend/lib/types.ts):
#   {
#     "leads": [ { "id": 1, "session_id": "...", "lead_score": "HOT", ... }, ... ],
#     "total": 42
#   }
@router.get(
    "/leads",
    response_model=LeadsResponse,
    summary="Get all leads",
    description="Returns all captured leads from the database, sorted by most recent first.",
)
def get_leads() -> LeadsResponse:
    leads_raw = database.get_all_leads()

    # Convert raw dicts to LeadRecord Pydantic models.
    # model_validate() is the Pydantic v2 way to create a model from a dict.
    # It validates the data and applies defaults for missing fields.
    leads = []
    for raw in leads_raw:
        try:
            leads.append(LeadRecord.model_validate(raw))
        except Exception:
            # Skip malformed records — don't let one bad row crash the whole list
            continue

    return LeadsResponse(leads=leads, total=len(leads))


# ── GET /api/leads/stats ──────────────────────────────────────────
#
# Returns aggregated lead counts for the 4 stat cards on the dashboard:
#   [ Total: 25 ] [ HOT: 8 ] [ WARM: 12 ] [ COLD: 5 ]
#
# WHY a separate endpoint (instead of computing in the frontend from /leads):
#   The SQL COUNT query is O(1) — instant regardless of table size.
#   Computing it in Python from a full list fetch is wasteful.
#   Separate endpoint = separate, cacheable, optimized query.
#
# IMPORTANT: This route must be defined BEFORE /leads/{session_id}
# because FastAPI matches routes top-to-bottom.
# If /leads/{session_id} came first, it would catch "stats" as a
# session_id parameter and you'd get a 404 from the database lookup!
@router.get(
    "/leads/stats",
    response_model=LeadStats,
    summary="Get lead statistics",
    description="Returns aggregated HOT/WARM/COLD counts for the dashboard stat cards.",
)
def get_stats() -> LeadStats:
    stats = database.get_lead_stats()
    return LeadStats(**stats)


# ── DELETE /api/leads/{session_id} ───────────────────────────────
#
# Deletes a lead and its conversation history by session ID.
# Called when the user clicks the delete button in the dashboard table.
#
# {session_id} is a path parameter — FastAPI extracts it from the URL.
# Example URL: DELETE /api/leads/550e8400-e29b-41d4-a716-446655440000
#
# Returns 204 No Content on success (standard REST for DELETE).
# Returns 404 if the session_id doesn't exist in the database.
@router.delete(
    "/leads/{session_id}",
    status_code=204,
    summary="Delete a lead",
    description="Permanently deletes a lead and its conversation history.",
)
def delete_lead(session_id: str) -> None:
    # Check that the lead exists before trying to delete
    existing = database.get_lead_by_session(session_id)
    if not existing:
        raise HTTPException(
            status_code=404,
            detail=f"Lead with session_id '{session_id}' not found.",
        )

    database.delete_lead(session_id)
    # Return None → FastAPI sends 204 No Content (no body)