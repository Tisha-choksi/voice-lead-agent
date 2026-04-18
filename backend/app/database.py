# ─────────────────────────────────────────────────────────────────
# FILE PATH: voice-lead-agent/backend/app/database.py
#
# WHY THIS FILE EXISTS:
#   This is the ONLY file that talks to SQLite.
#   All database logic — creating tables, saving leads, reading rows —
#   lives here. Routes and services NEVER write raw SQL themselves.
#
#   This pattern is called the "Repository Pattern":
#   ✓ Change from SQLite to PostgreSQL later? Edit only this file.
#   ✓ Need to debug a data bug? Check only this file.
#   ✓ Routes stay thin — they don't need to know SQL exists.
#
# WHY SQLite (not Supabase/PostgreSQL):
#   • Zero setup — no account, no server, no connection string
#   • The entire database is a single file (leads.db)
#   • Handles hundreds of leads easily — way more than a prototype needs
#   • Render.com free tier supports it via ephemeral /tmp disk
# ─────────────────────────────────────────────────────────────────

import sqlite3
import json
from datetime import datetime
from typing import Optional
from app.config import settings


# ── Connection helper ─────────────────────────────────────────────
#
# WHY a function and not a module-level connection:
#   SQLite connections are NOT thread-safe by default.
#   FastAPI handles requests concurrently (multiple threads).
#   If you share one connection across threads → race conditions → data corruption.
#
#   Solution: create a new connection per request (cheap for SQLite),
#   use it, then close it. The `with` statement in each function
#   handles closing automatically, even if an exception occurs.
#
# row_factory = sqlite3.Row:
#   Without this: cursor.fetchone() returns a plain tuple → row[0], row[1]
#   With this:    cursor.fetchone() returns a dict-like object → row["session_id"]
#   Much safer — column order changes don't break your code.
def _get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ── Table creation ────────────────────────────────────────────────
#
# Called ONCE at app startup from main.py's lifespan function.
#
# CREATE TABLE IF NOT EXISTS:
#   Safe to call repeatedly — does nothing if the table already exists.
#   This means you don't need a separate migration step.
#
# WHY two tables:
#   leads → one row per conversation session (the lead record)
#   conversations → every individual message exchanged (for future audit log)
#
# SQLite data types are flexible:
#   TEXT  → strings, dates (stored as ISO strings), JSON blobs
#   INTEGER → numbers, booleans (0/1)
#   The database doesn't enforce Python types — Pydantic does that above.
def init_db() -> None:
    with _get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS leads (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id      TEXT    UNIQUE NOT NULL,
                first_message   TEXT    NOT NULL,
                name            TEXT    DEFAULT 'Unknown',
                phone           TEXT,
                email           TEXT,
                lead_score      TEXT    DEFAULT 'COLD',
                qualification_data TEXT,
                created_at      TEXT    DEFAULT (datetime('now')),
                updated_at      TEXT    DEFAULT (datetime('now'))
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id  TEXT    NOT NULL,
                role        TEXT    NOT NULL,
                message     TEXT    NOT NULL,
                timestamp   TEXT    DEFAULT (datetime('now')),
                FOREIGN KEY (session_id) REFERENCES leads(session_id)
            )
        """)

        # Index speeds up lookups by session_id.
        # Without an index, every query scans the entire table.
        # With the index, lookups are O(log n) — instant even with 10k rows.
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_leads_session_id
            ON leads(session_id)
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_conversations_session_id
            ON conversations(session_id)
        """)

        conn.commit()

    print(f"✅ Database initialized at: {settings.DB_PATH}")


# ── WRITE: Save a new lead ────────────────────────────────────────
#
# Called when: the very first message of a new session arrives.
# At this point we only know the session_id and first_message.
# All other fields (lead_score, qualification_data) are updated later.
#
# INSERT OR IGNORE:
#   If a row with this session_id already exists, do nothing.
#   This makes the function safe to call multiple times — idempotent.
#   (Without OR IGNORE, a duplicate session_id would raise an IntegrityError.)
def save_lead(session_id: str, first_message: str, lead_score: str = "COLD") -> None:
    with _get_connection() as conn:
        conn.execute(
            """
            INSERT OR IGNORE INTO leads
                (session_id, first_message, lead_score, created_at, updated_at)
            VALUES
                (?, ?, ?, datetime('now'), datetime('now'))
            """,
            (session_id, first_message, lead_score),
        )
        conn.commit()


# ── WRITE: Update lead after each message ────────────────────────
#
# Called after EVERY Aria response to update the lead score
# and qualification data as the conversation progresses.
#
# WHY update every message (not just at the end):
#   If the user closes the browser mid-conversation, we still have
#   whatever data was gathered so far. Partial data > no data.
#
# qualification_data is stored as a JSON string in SQLite.
# We serialize it here with json.dumps() and deserialize
# in get_all_leads() with json.loads().
def update_lead(
    session_id: str,
    lead_score: str,
    qualification_data: dict,
) -> None:
    with _get_connection() as conn:
        conn.execute(
            """
            UPDATE leads
            SET
                lead_score         = ?,
                qualification_data = ?,
                updated_at         = datetime('now')
            WHERE session_id = ?
            """,
            (lead_score, json.dumps(qualification_data), session_id),
        )
        conn.commit()


# ── READ: Get one lead by session ID ─────────────────────────────
#
# Used by chat.py to check if this session already has a lead record.
# Returns None if not found (first message of a new session).
#
# dict(row) converts sqlite3.Row to a plain Python dict.
# This is necessary because sqlite3.Row objects are not JSON-serializable.
def get_lead_by_session(session_id: str) -> Optional[dict]:
    with _get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM leads WHERE session_id = ?",
            (session_id,),
        ).fetchone()

    return dict(row) if row else None


# ── READ: Get all leads ───────────────────────────────────────────
#
# Used by GET /api/leads to populate the dashboard table.
# Returns newest leads first (ORDER BY updated_at DESC).
#
# qualification_data comes out of SQLite as a JSON string.
# We parse it back to a dict here so the route can return it
# as a proper JSON object (not a string containing JSON).
def get_all_leads() -> list[dict]:
    with _get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM leads ORDER BY updated_at DESC"
        ).fetchall()

    leads = []
    for row in rows:
        lead = dict(row)
        if lead.get("qualification_data"):
            try:
                lead["qualification_data"] = json.loads(lead["qualification_data"])
            except (json.JSONDecodeError, TypeError):
                # If JSON is malformed, leave it as a string — don't crash
                pass
        leads.append(lead)

    return leads


# ── READ: Get aggregated stats ────────────────────────────────────
#
# Used by GET /api/leads/stats for the dashboard stat cards.
#
# We do the counting in SQL (efficient) rather than fetching all
# rows and counting in Python (wasteful — loads entire table).
#
# SUM(CASE WHEN ... THEN 1 ELSE 0 END) is standard SQL for
# counting rows that match a condition in a single query pass.
def get_lead_stats() -> dict:
    with _get_connection() as conn:
        row = conn.execute(
            """
            SELECT
                COUNT(*)                                          AS total,
                SUM(CASE WHEN lead_score = 'HOT'  THEN 1 ELSE 0 END) AS hot,
                SUM(CASE WHEN lead_score = 'WARM' THEN 1 ELSE 0 END) AS warm,
                SUM(CASE WHEN lead_score = 'COLD' THEN 1 ELSE 0 END) AS cold
            FROM leads
            """
        ).fetchone()

    return {
        "total": row["total"] or 0,
        "hot":   row["hot"]   or 0,
        "warm":  row["warm"]  or 0,
        "cold":  row["cold"]  or 0,
    }


# ── DELETE: Remove a lead ─────────────────────────────────────────
#
# Used by DELETE /api/leads/{session_id}.
# Deletes both the lead record AND its conversation history.
# Order matters: delete conversations first (foreign key constraint).
def delete_lead(session_id: str) -> None:
    with _get_connection() as conn:
        conn.execute(
            "DELETE FROM conversations WHERE session_id = ?",
            (session_id,),
        )
        conn.execute(
            "DELETE FROM leads WHERE session_id = ?",
            (session_id,),
        )
        conn.commit()

# ── WRITE: Save a conversation message ───────────────────────────
#
# Stores every individual message for future audit/replay.
# Not used by the MVP dashboard, but useful for:
#   - Replaying a conversation to understand a hot lead
#   - Training data for fine-tuning a custom model later
#   - Debugging unexpected lead scores
def save_message(session_id: str, role: str, message: str) -> None:
    with _get_connection() as conn:
        conn.execute(
            """
            INSERT INTO conversations (session_id, role, message, timestamp)
            VALUES (?, ?, ?, datetime('now'))
            """,
            (session_id, role, message),
        )
        conn.commit()