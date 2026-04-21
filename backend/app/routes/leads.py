from fastapi import APIRouter, HTTPException
from app.models import LeadsResponse, LeadStats, LeadRecord
from app import database

router = APIRouter()


@router.get("/leads", response_model=LeadsResponse)
def get_leads() -> LeadsResponse:
    leads = []
    for raw in database.get_all_leads():
        try:
            leads.append(LeadRecord.model_validate(raw))
        except Exception:
            continue
    return LeadsResponse(leads=leads, total=len(leads))


@router.get("/leads/stats", response_model=LeadStats)
def get_stats() -> LeadStats:
    return LeadStats(**database.get_lead_stats())


@router.delete("/leads/{session_id}", status_code=204)
def delete_lead(session_id: str) -> None:
    if not database.get_lead_by_session(session_id):
        raise HTTPException(status_code=404, detail=f"Lead '{session_id}' not found.")
    database.delete_lead(session_id)
