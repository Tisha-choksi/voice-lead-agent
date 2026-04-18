# ─────────────────────────────────────────────────────────────────
# FILE PATH: voice-lead-agent/backend/app/config.py
#
# WHY THIS FILE EXISTS:
#   Every time you need an env variable, you could write:
#     import os
#     key = os.environ.get("GROQ_API_KEY")
#
#   But that has problems:
#   ✗ If the variable is missing, you get a silent None bug later
#   ✗ You'd scatter os.environ.get() calls across 5 different files
#   ✗ No central place to see ALL config at once
#   ✗ No validation that required variables actually exist
#
#   This file solves all of that:
#   ✓ Loads .env file automatically via python-dotenv
#   ✓ Validates required variables exist at STARTUP (fail fast)
#   ✓ Single import: from app.config import settings
#   ✓ One place to see every config option the app uses
# ─────────────────────────────────────────────────────────────────

import os
from pathlib import Path
from dotenv import load_dotenv

# ── Load .env file ────────────────────────────────────────────────
#
# python-dotenv reads backend/.env and injects values into os.environ.
# This must happen BEFORE any os.environ.get() call.
#
# Path(__file__).parent.parent finds the backend/ directory:
#   __file__ = backend/app/config.py
#   .parent  = backend/app/
#   .parent  = backend/
#
# override=False means: if a var is already set (e.g. in production
# via Render's dashboard), don't overwrite it with the .env file value.
# This lets production env vars take precedence over local .env files.
_env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=_env_path, override=False)
# ── Settings class ────────────────────────────────────────────────
#
# WHY a class and not just module-level variables:
#   A class makes it easy to mock in tests:
#     from unittest.mock import patch
#     with patch.object(settings, 'GROQ_API_KEY', 'test-key'):
#         ...
#
#   And it's explicit: from app.config import settings is clear
#   vs from app.config import GROQ_API_KEY (looks like a constant, not config)
class Settings:

    # ── Groq LLM ─────────────────────────────────────────────────
    #
    # REQUIRED — the app cannot run without this.
    # Checked at startup in main.py's lifespan function.
    GROQ_API_KEY: str = os.environ.get("GROQ_API_KEY", "")
    # Which model to use. llama-3.3-70b-versatile is the best
    # free-tier model on Groq as of late 2024.
    GROQ_MODEL: str = os.environ.get(
        "GROQ_MODEL", "llama-3.3-70b-versatile"
    )
    # Max tokens in the LLM's response.
    # 300 is enough for 2-3 sentences — ideal for voice (short answers).
    # Higher = slower response + more tokens used against free tier limit.
    GROQ_MAX_TOKENS: int = int(os.environ.get("GROQ_MAX_TOKENS", "300"))

    # Temperature controls randomness (0.0 = deterministic, 1.0 = creative).
    # 0.7 is a good balance for sales conversations: natural but not erratic.
    GROQ_TEMPERATURE: float = float(os.environ.get("GROQ_TEMPERATURE", "0.7"))

    # ── Database ─────────────────────────────────────────────────
    #
    # SQLite file path. Relative paths are relative to where uvicorn is run.
    # On Render.com free tier, use "/tmp/leads.db" (ephemeral — resets on restart)
    # For persistent storage on Render, use a paid disk volume.
    DB_PATH: str = os.environ.get("DB_PATH", "leads.db")

    # ── CORS ─────────────────────────────────────────────────────
    #
    # Which frontend URLs are allowed to call this API.
    # CORS (Cross-Origin Resource Sharing) is a browser security feature.
    # Without the correct CORS_ORIGINS, your browser will block API calls
    # with "CORS policy" errors even if the server responds fine.
    #
    # Stored as comma-separated string in .env, parsed to list here.
    # Example: "http://localhost:3000,https://your-app.vercel.app"
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.environ.get(
            "CORS_ORIGINS", "http://localhost:3000,http://localhost:3001"
        ).split(",")
        if origin.strip()
    ]

    # ── Server ───────────────────────────────────────────────────
    PORT: int = int(os.environ.get("PORT", "8000"))

    # "development" or "production"
    # Used for: debug logging, error detail exposure
    ENVIRONMENT: str = os.environ.get("ENVIRONMENT", "development")

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    # ── Agent persona ─────────────────────────────────────────────
    #
    # These are injected into the system prompt in services/prompt.py.
    # Change these without touching the prompt code.
    AGENT_NAME: str = os.environ.get("AGENT_NAME", "Aria")
    AGENT_COMPANY: str = os.environ.get("AGENT_COMPANY", "our company")
    # ── Validation ───────────────────────────────────────────────
    #
    # Called from main.py at startup.
    # Raises an error IMMEDIATELY if required config is missing,
    # rather than failing silently on the first API call.
    #
    # "Fail fast" principle: catch misconfigurations at boot,
    # not 30 minutes into production when the first user hits the endpoint.
    def validate(self) -> None:
        errors = []

        if not self.GROQ_API_KEY:
            errors.append(
                "GROQ_API_KEY is not set. "
                "Get a free key at https://console.groq.com "
                "and add it to backend/.env"
            )

        if not self.GROQ_API_KEY.startswith("gsk_") and self.GROQ_API_KEY:
            errors.append(
                f"GROQ_API_KEY looks invalid (should start with 'gsk_'). "
                f"Got: {self.GROQ_API_KEY[:10]}..."
            )

        if errors:
            error_msg = "\n".join(f"  ✗ {e}" for e in errors)
            raise ValueError(
                f"\n\nConfiguration errors found:\n{error_msg}\n\n"
                f"Fix these in backend/.env and restart the server.\n"
            )
        print(f"✅ Config loaded successfully")
        print(f"   Model:       {self.GROQ_MODEL}")
        print(f"   Database:    {self.DB_PATH}")
        print(f"   Environment: {self.ENVIRONMENT}")
        print(f"   CORS origins: {', '.join(self.CORS_ORIGINS)}")

# ── Singleton instance ────────────────────────────────────────────
#
# Create ONE instance that all other files import.
# Usage in any file: from app.config import settings
#
# Python modules are cached — importing settings from multiple files
# always returns the SAME object. No duplicate loading.
settings = Settings()