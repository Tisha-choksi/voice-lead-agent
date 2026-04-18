# ─────────────────────────────────────────────────────────────────
# FILE PATH: voice-lead-agent/backend/app/services/qualifier.py
#
# WHY THIS FILE EXISTS:
#   The Groq LLM returns a response that looks like this:
#
#   "Hello! I'm Aria. What brings you here today?
#
#    QUALIFICATION_DATA: {"intent": "unknown", "budget": "unknown", ...}"
#
#   This file has ONE job: split that string into:
#     1. aria_reply  → "Hello! I'm Aria. What brings you here today?"
#     2. qual_data   → {"intent": "unknown", "budget": "unknown", ...}
#
#   It also validates and sanitizes the extracted data, applying
#   fallback defaults if the LLM's JSON is malformed or missing.
#
# WHY embed JSON in the LLM response (instead of two separate API calls):
#   Option A (what we do): Ask the LLM to embed qualification JSON in
#     its response → parse it out. ONE API call per message.
#
#   Option B: Make one API call for Aria's reply, then a SECOND call
#     asking "classify this conversation as HOT/WARM/COLD".
#     → TWICE the latency, TWICE the tokens, TWICE the cost.
#
#   Option A is the standard technique used in production voice agents.
# ─────────────────────────────────────────────────────────────────

import json
import re
from typing import Tuple

from app.models import QualificationData


# ── Sentinel marker ───────────────────────────────────────────────
#
# This string is what we told the LLM to use in the system prompt.
# The LLM appends it at the end of every response, followed by JSON.
# We split on this marker to separate Aria's words from the data.
_MARKER = "QUALIFICATION_DATA:"


# ── Default qualification data ────────────────────────────────────
#
# Used as a fallback when the LLM fails to include qualification data,
# or when the JSON is malformed (e.g., LLM hallucinated invalid JSON).
#
# This prevents the entire request from crashing just because
# the LLM had an off response. Graceful degradation.
_DEFAULT_QUAL_DATA = QualificationData(
    intent="unknown",
    budget="unknown",
    timeline="unknown",
    is_decision_maker="unknown",
    lead_score="COLD",
    conversation_stage="greeting",
)


# ── Main function: parse_llm_response ────────────────────────────
#
# Takes the raw LLM output string.
# Returns a tuple of (aria's spoken reply, structured qualification data).
#
# Example input:
#   "Hi there! I'm Aria. What are you looking for today?
#
#    QUALIFICATION_DATA: {"intent": "unknown", "budget": "unknown",
#    "timeline": "unknown", "is_decision_maker": "unknown",
#    "lead_score": "COLD", "conversation_stage": "greeting"}"
#
# Example output:
#   ("Hi there! I'm Aria. What are you looking for today?",
#    QualificationData(intent="unknown", lead_score="COLD", ...))
def parse_llm_response(raw_response: str) -> Tuple[str, QualificationData]:
    # ── Step 1: Split on the marker ──────────────────────────────
    #
    # Find the marker in the response.
    # If not found, the LLM forgot to include it — return the full
    # response as Aria's reply and use default qualification data.
    if _MARKER not in raw_response:
        aria_reply = raw_response.strip()
        return aria_reply, _DEFAULT_QUAL_DATA

    # Split into two parts at the first occurrence of the marker.
    # We use maxsplit=1 so if "QUALIFICATION_DATA:" appears in the
    # spoken reply for some reason, we don't accidentally split there.
    parts = raw_response.split(_MARKER, maxsplit=1)
    aria_reply = parts[0].strip()
    json_part  = parts[1].strip() if len(parts) > 1 else ""

    # ── Step 2: Parse the JSON ────────────────────────────────────
    #
    # LLMs sometimes add markdown code fences (```json ... ```) or
    # extra text after the JSON. We clean those up before parsing.
    qual_data = _parse_qualification_json(json_part)

    # ── Step 3: Sanitize Aria's reply ────────────────────────────
    #
    # Remove any leftover QUALIFICATION_DATA text that might have
    # leaked into the reply (shouldn't happen, but defensive coding).
    aria_reply = _sanitize_reply(aria_reply)

    # If after all parsing the reply is empty, use a fallback
    if not aria_reply:
        aria_reply = "I'm here to help. What can I assist you with today?"

    return aria_reply, qual_data


# ── Helper: parse qualification JSON ─────────────────────────────
def _parse_qualification_json(json_str: str) -> QualificationData:
    # Remove markdown code fences if present
    # LLMs sometimes wrap JSON in ```json ... ``` blocks
    json_str = re.sub(r"```(?:json)?", "", json_str).strip()
    json_str = json_str.strip("`").strip()

    # Find the first { and last } to extract just the JSON object.
    # This handles trailing text after the JSON.
    start = json_str.find("{")
    end   = json_str.rfind("}") + 1

    if start == -1 or end == 0:
        # No JSON object found at all
        return _DEFAULT_QUAL_DATA

    json_str = json_str[start:end]

    # ── Attempt to parse ─────────────────────────────────────────
    try:
        raw_dict = json.loads(json_str)
    except json.JSONDecodeError:
        # JSON is malformed — LLM used single quotes, or forgot commas, etc.
        # Try a lenient parse approach: replace single quotes with double quotes
        try:
            fixed = json_str.replace("'", '"')
            raw_dict = json.loads(fixed)
        except json.JSONDecodeError:
            # Truly unparseable — use defaults
            return _DEFAULT_QUAL_DATA

    # ── Validate and build QualificationData ─────────────────────
    #
    # We don't trust the LLM's values blindly.
    # For lead_score and conversation_stage, we validate against
    # the allowed values and fall back to safe defaults if invalid.
    return _build_qual_data(raw_dict)


def _build_qual_data(raw: dict) -> QualificationData:
    # Validate lead_score — must be one of three values
    valid_scores = {"HOT", "WARM", "COLD"}
    lead_score = str(raw.get("lead_score", "COLD")).upper()
    if lead_score not in valid_scores:
        lead_score = "COLD"

    # Validate conversation_stage
    valid_stages = {"greeting", "discovery", "qualification", "closing"}
    stage = str(raw.get("conversation_stage", "greeting")).lower()
    if stage not in valid_stages:
        stage = "greeting"

    # Validate is_decision_maker
    # LLM might return: true, false, "true", "false", "unknown", "yes", "no"
    idm_raw = raw.get("is_decision_maker", "unknown")
    if isinstance(idm_raw, bool):
        is_decision_maker = idm_raw
    elif str(idm_raw).lower() in ("true", "yes"):
        is_decision_maker = True
    elif str(idm_raw).lower() in ("false", "no"):
        is_decision_maker = False
    else:
        is_decision_maker = "unknown"

    return QualificationData(
        intent=str(raw.get("intent", "unknown"))[:500],  # Cap length
        budget=str(raw.get("budget", "unknown"))[:200],
        timeline=str(raw.get("timeline", "unknown"))[:200],
        is_decision_maker=is_decision_maker,
        lead_score=lead_score,           # type: ignore[arg-type]
        conversation_stage=stage,        # type: ignore[arg-type]
    )


# ── Helper: sanitize Aria's reply ────────────────────────────────
def _sanitize_reply(reply: str) -> str:
    # Remove any accidental QUALIFICATION_DATA leakage
    if _MARKER in reply:
        reply = reply.split(_MARKER)[0]

    # Remove markdown formatting (LLMs sometimes add ** or __)
    reply = re.sub(r"\*\*(.*?)\*\*", r"\1", reply)  # **bold** → bold
    reply = re.sub(r"__(.*?)__", r"\1", reply)       # __bold__ → bold
    reply = re.sub(r"\*(.*?)\*", r"\1", reply)       # *italic* → italic

    # Remove any leading/trailing whitespace or blank lines
    reply = reply.strip()

    return reply