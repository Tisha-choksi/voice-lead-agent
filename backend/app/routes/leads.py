# FILE PATH: voice-lead-agent/backend/app/routes/leads.py

from fastapi import APIRouter, HTTPException
from app.models import LeadsResponse, LeadStats, LeadRecord
from app import database

router = APIRouter()


@router.get(
    "/leads",
    response_model=LeadsResponse,
    summary="Get all leads",
)
def get_leads() -> LeadsResponse:
    leads_raw = database.get_all_leads()

    leads = []
    for raw in leads_raw:
        try:
            leads.append(LeadRecord.model_validate(raw))
        except Exception:
            continue

    return LeadsResponse(leads=leads, total=len(leads))


# IMPORTANT: /leads/stats must come BEFORE /leads/{session_id}
# otherwise FastAPI treats "stats" as a session_id parameter
@router.get(
    "/leads/stats",
    response_model=LeadStats,
    summary="Get lead statistics",
)
def get_stats() -> LeadStats:
    stats = database.get_lead_stats()
    return LeadStats(**stats)


@router.delete(
    "/leads/{session_id}",
    status_code=204,
    summary="Delete a lead",
)
def delete_lead(session_id: str) -> None:
    existing = database.get_lead_by_session(session_id)
    if not existing:
        raise HTTPException(
            status_code=404,
            detail=f"Lead with session_id '{session_id}' not found.",
        )

    database.delete_lead(session_id)