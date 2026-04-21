from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models import HealthResponse
from app import database
from app.routes import chat, leads


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n🚀 Starting Aria Voice Agent backend...")
    settings.validate()
    database.init_db()
    print("✅ Ready at http://localhost:8000/docs\n")
    yield
    print("\n👋 Shutting down...")


app = FastAPI(
    title="Aria Voice Agent API",
    description="Sarvam AI + Edge TTS + SSE Streaming",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(chat.router,  prefix="/api", tags=["Voice Agent"])
app.include_router(leads.router, prefix="/api", tags=["Lead Management"])


@app.get("/", response_model=HealthResponse, tags=["Health"])
def health() -> HealthResponse:
    return HealthResponse(
        status=f"✅ Aria v2 running | Model: {settings.SARVAM_MODEL} | Voice: {settings.EDGE_TTS_VOICE}"
    )
