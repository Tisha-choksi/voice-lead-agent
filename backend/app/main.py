# ─────────────────────────────────────────────────────────────────
# FILE PATH: voice-lead-agent/backend/app/main.py
#
# WHY THIS FILE EXISTS:
#   This is the entry point of the entire backend application.
#   It's written LAST because it imports everything else and
#   assembles it into a single working app.
#
#   This file's jobs (and ONLY these jobs):
#   1. Create the FastAPI app instance
#   2. Add middleware (CORS)
#   3. Register all routers (attach routes to the app)
#   4. Define startup/shutdown logic (init DB, validate config)
#   5. Define the health check root endpoint
#
#   Running the server:
#     uvicorn app.main:app --reload --port 8000
#     ↑ tells uvicorn: "find the 'app' object in app/main.py"
# ─────────────────────────────────────────────────────────────────

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models import HealthResponse
from app import database
from app.routes import chat, leads


# ── Lifespan (startup + shutdown) ─────────────────────────────────
#
# @asynccontextmanager + lifespan replaces the old @app.on_event("startup").
# This is the modern FastAPI way (v0.93+).
#
# Code BEFORE `yield` runs at startup:
#   - Validate configuration (crash early if GROQ_API_KEY is missing)
#   - Initialize the database (create tables if they don't exist)
#
# Code AFTER `yield` runs at shutdown:
#   - Clean up resources (close connections, flush logs, etc.)
#   - For SQLite we don't need explicit cleanup — connections close automatically.
#
# WHY validate at startup:
#   "Fail fast" principle. If GROQ_API_KEY is missing, you want to know
#   the moment you run uvicorn — not 30 minutes later when the first
#   user sends a message and gets a cryptic 500 error.
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── STARTUP ──────────────────────────────────────────────────
    print("\n🚀 Starting Voice Lead Agent backend...")

    # 1. Validate all required environment variables
    settings.validate()

    # 2. Create SQLite tables if they don't exist
    database.init_db()

    print("✅ Backend ready. API docs at http://localhost:8000/docs\n")

    yield  # ← App is running and accepting requests here

    # ── SHUTDOWN ─────────────────────────────────────────────────
    print("\n👋 Backend shutting down...")


# ── FastAPI app instance ──────────────────────────────────────────
#
# title, description, version → shown in the /docs Swagger UI
# lifespan → our startup/shutdown handler above
# docs_url → where to find the interactive API docs
#
# In production (Render.com), docs_url=None hides the docs page.
# For a prototype, keep them accessible — they're invaluable for debugging.
app = FastAPI(
    title="Aria Voice Lead Agent API",
    description="""
    AI-powered voice agent backend for lead qualification.

    **Stack:** FastAPI + Groq LLaMA-3.3-70B + SQLite

    **Flow:**
    1. Frontend sends user speech (as text) to POST /api/chat
    2. Backend calls LLaMA-3 with Aria's persona prompt
    3. LLM returns Aria's reply + embedded lead qualification JSON
    4. Backend parses, saves to SQLite, and returns ChatResponse
    5. Frontend speaks Aria's reply via browser TTS
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",       # Swagger UI
    redoc_url="/redoc",     # ReDoc (alternative docs UI)
)


# ── CORS Middleware ───────────────────────────────────────────────
#
# CORS = Cross-Origin Resource Sharing.
# Browsers BLOCK requests from one domain to another by default.
# Without this middleware, your Next.js app (localhost:3000) cannot
# call this FastAPI backend (localhost:8000) — the browser stops it.
#
# allow_origins:     Which frontend URLs can call this API
# allow_methods:     Which HTTP methods are allowed
# allow_headers:     Which request headers are allowed
# allow_credentials: Whether cookies/auth headers can be sent
#
# In production, replace allow_origins with your specific Vercel URL.
# NEVER use allow_origins=["*"] in production — it allows any website
# to call your API on behalf of your users (CSRF risk).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


# ── Register routes ───────────────────────────────────────────────
#
# include_router attaches all routes from a router file to the app.
# prefix="/api" means every route in that router is prefixed with /api.
#
# Result:
#   chat.router    → POST /api/chat
#   leads.router   → GET  /api/leads
#                  → GET  /api/leads/stats
#                  → DELETE /api/leads/{session_id}
#
# tags=["..."] groups routes in the /docs Swagger UI for readability.
app.include_router(
    chat.router,
    prefix="/api",
    tags=["Voice Agent"],
)
app.include_router(
    leads.router,
    prefix="/api",
    tags=["Lead Management"],
)


# ── Health check endpoint ─────────────────────────────────────────
#
# GET / → returns {"status": "..."} to confirm the server is running.
#
# Used by:
#   - frontend/lib/api.ts → checkBackendHealth() on page load
#   - Render.com health checks (keeps the free dyno alive)
#   - You, when you want to verify the server is up:
#     curl http://localhost:8000/
#
# No prefix — this is at the root, not /api/
@app.get(
    "/",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Health check",
)
def health_check() -> HealthResponse:
    return HealthResponse(
        status=f"✅ {settings.AGENT_NAME} Voice Agent is running | "
               f"Model: {settings.GROQ_MODEL} | "
               f"Env: {settings.ENVIRONMENT}"
    )