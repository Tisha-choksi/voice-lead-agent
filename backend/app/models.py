from pydantic import BaseModel, Field
from typing import Optional, List, Literal, Union

LeadScoreType       = Literal["HOT", "WARM", "COLD"]
ConversationStageType = Literal["greeting", "discovery", "qualification", "closing"]


class QualificationData(BaseModel):
    intent:             str   = "unknown"
    budget:             str   = "unknown"
    timeline:           str   = "unknown"
    is_decision_maker:  Union[bool, str] = "unknown"
    lead_score:         LeadScoreType = "COLD"
    conversation_stage: ConversationStageType = "greeting"


class ConversationMessage(BaseModel):
    role:    Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message:              str = Field(..., min_length=1, max_length=2000)
    session_id:           Optional[str] = None
    conversation_history: List[ConversationMessage] = Field(default=[], max_length=20)


class ChatResponse(BaseModel):
    reply:              str
    session_id:         str
    lead_score:         LeadScoreType
    qualification_data: QualificationData
    conversation_stage: ConversationStageType


class LeadRecord(BaseModel):
    id:                 int
    session_id:         str
    first_message:      str
    name:               str = "Unknown"
    phone:              Optional[str] = None
    email:              Optional[str] = None
    lead_score:         LeadScoreType = "COLD"
    qualification_data: Optional[Union[QualificationData, dict]] = None
    created_at:         str
    updated_at:         str


class LeadsResponse(BaseModel):
    leads: List[LeadRecord]
    total: int


class LeadStats(BaseModel):
    total: int
    hot:   int
    warm:  int
    cold:  int


class HealthResponse(BaseModel):
    status: str
