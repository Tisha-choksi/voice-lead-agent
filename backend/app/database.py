import sqlite3
import json
from typing import Optional
from app.config import settings


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS leads (
                id                 INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id         TEXT    UNIQUE NOT NULL,
                first_message      TEXT    NOT NULL,
                name               TEXT    DEFAULT 'Unknown',
                phone              TEXT,
                email              TEXT,
                lead_score         TEXT    DEFAULT 'COLD',
                qualification_data TEXT,
                created_at         TEXT    DEFAULT (datetime('now')),
                updated_at         TEXT    DEFAULT (datetime('now'))
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role       TEXT NOT NULL,
                message    TEXT NOT NULL,
                timestamp  TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (session_id) REFERENCES leads(session_id)
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_leads_session ON leads(session_id)")
        conn.commit()
    print(f"✅ Database ready: {settings.DB_PATH}")


def save_lead(session_id: str, first_message: str, lead_score: str = "COLD") -> None:
    with _conn() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO leads (session_id, first_message, lead_score) VALUES (?,?,?)",
            (session_id, first_message, lead_score),
        )
        conn.commit()


def update_lead(session_id: str, lead_score: str, qualification_data: dict) -> None:
    with _conn() as conn:
        conn.execute(
            "UPDATE leads SET lead_score=?, qualification_data=?, updated_at=datetime('now') WHERE session_id=?",
            (lead_score, json.dumps(qualification_data), session_id),
        )
        conn.commit()


def get_lead_by_session(session_id: str) -> Optional[dict]:
    with _conn() as conn:
        row = conn.execute("SELECT * FROM leads WHERE session_id=?", (session_id,)).fetchone()
    return dict(row) if row else None


def get_all_leads() -> list[dict]:
    with _conn() as conn:
        rows = conn.execute("SELECT * FROM leads ORDER BY updated_at DESC").fetchall()
    result = []
    for row in rows:
        lead = dict(row)
        if lead.get("qualification_data"):
            try:
                lead["qualification_data"] = json.loads(lead["qualification_data"])
            except Exception:
                pass
        result.append(lead)
    return result


def get_lead_stats() -> dict:
    with _conn() as conn:
        row = conn.execute("""
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN lead_score='HOT'  THEN 1 ELSE 0 END) AS hot,
                SUM(CASE WHEN lead_score='WARM' THEN 1 ELSE 0 END) AS warm,
                SUM(CASE WHEN lead_score='COLD' THEN 1 ELSE 0 END) AS cold
            FROM leads
        """).fetchone()
    return {"total": row["total"] or 0, "hot": row["hot"] or 0,
            "warm": row["warm"] or 0, "cold": row["cold"] or 0}


def delete_lead(session_id: str) -> None:
    with _conn() as conn:
        conn.execute("DELETE FROM conversations WHERE session_id=?", (session_id,))
        conn.execute("DELETE FROM leads WHERE session_id=?", (session_id,))
        conn.commit()


def save_message(session_id: str, role: str, message: str) -> None:
    with _conn() as conn:
        conn.execute(
            "INSERT INTO conversations (session_id, role, message) VALUES (?,?,?)",
            (session_id, role, message),
        )
        conn.commit()
