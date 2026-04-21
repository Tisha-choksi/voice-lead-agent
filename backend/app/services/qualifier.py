import json
import re
from typing import Tuple
from app.models import QualificationData

_MARKER = "QUALIFICATION_DATA:"

_DEFAULT = QualificationData(
    intent="unknown", budget="unknown", timeline="unknown",
    is_decision_maker="unknown", lead_score="COLD", conversation_stage="greeting",
)


def parse_llm_response(raw: str) -> Tuple[str, QualificationData]:
    if _MARKER not in raw:
        return raw.strip(), _DEFAULT

    parts     = raw.split(_MARKER, maxsplit=1)
    aria_reply = _clean_reply(parts[0].strip())
    qual_data  = _parse_json(parts[1].strip() if len(parts) > 1 else "")

    return aria_reply or "I'm here to help. What can I assist you with?", qual_data


def _parse_json(json_str: str) -> QualificationData:
    json_str = re.sub(r"```(?:json)?", "", json_str).strip().strip("`").strip()
    start = json_str.find("{")
    end   = json_str.rfind("}") + 1
    if start == -1 or end == 0:
        return _DEFAULT
    json_str = json_str[start:end]

    try:
        raw = json.loads(json_str)
    except json.JSONDecodeError:
        try:
            raw = json.loads(json_str.replace("'", '"'))
        except json.JSONDecodeError:
            return _DEFAULT

    valid_scores  = {"HOT", "WARM", "COLD"}
    valid_stages  = {"greeting", "discovery", "qualification", "closing"}

    lead_score = str(raw.get("lead_score", "COLD")).upper()
    if lead_score not in valid_scores:
        lead_score = "COLD"

    stage = str(raw.get("conversation_stage", "greeting")).lower()
    if stage not in valid_stages:
        stage = "greeting"

    idm = raw.get("is_decision_maker", "unknown")
    if isinstance(idm, bool):
        is_dm = idm
    elif str(idm).lower() in ("true", "yes"):
        is_dm = True
    elif str(idm).lower() in ("false", "no"):
        is_dm = False
    else:
        is_dm = "unknown"

    return QualificationData(
        intent=str(raw.get("intent", "unknown"))[:500],
        budget=str(raw.get("budget", "unknown"))[:200],
        timeline=str(raw.get("timeline", "unknown"))[:200],
        is_decision_maker=is_dm,
        lead_score=lead_score,            # type: ignore
        conversation_stage=stage,         # type: ignore
    )


def _clean_reply(reply: str) -> str:
    if _MARKER in reply:
        reply = reply.split(_MARKER)[0]
    reply = re.sub(r"\*\*(.*?)\*\*", r"\1", reply)
    reply = re.sub(r"__(.*?)__",     r"\1", reply)
    reply = re.sub(r"\*(.*?)\*",     r"\1", reply)
    return reply.strip()