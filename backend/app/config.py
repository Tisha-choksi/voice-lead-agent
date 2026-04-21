import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env", override=False)


class Settings:
    # Sarvam AI
    SARVAM_API_KEY:    str   = os.environ.get("SARVAM_API_KEY", "")
    SARVAM_MODEL:      str   = os.environ.get("SARVAM_MODEL", "sarvam-m")
    SARVAM_BASE_URL:   str   = os.environ.get("SARVAM_BASE_URL", "https://api.sarvam.ai/v1")
    SARVAM_MAX_TOKENS: int   = int(os.environ.get("SARVAM_MAX_TOKENS", "400"))
    SARVAM_TEMPERATURE: float = float(os.environ.get("SARVAM_TEMPERATURE", "0.7"))

    # Edge TTS
    EDGE_TTS_VOICE: str = os.environ.get("EDGE_TTS_VOICE", "en-IN-NeerjaNeural")
    EDGE_TTS_RATE:  str = os.environ.get("EDGE_TTS_RATE",  "+0%")
    EDGE_TTS_PITCH: str = os.environ.get("EDGE_TTS_PITCH", "+0Hz")

    # Database
    DB_PATH: str = os.environ.get("DB_PATH", "leads.db")

    # CORS
    CORS_ORIGINS: list[str] = [
        o.strip()
        for o in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
        if o.strip()
    ]

    # Server
    PORT:        int = int(os.environ.get("PORT", "8000"))
    ENVIRONMENT: str = os.environ.get("ENVIRONMENT", "development")

    # Agent persona
    AGENT_NAME:    str = os.environ.get("AGENT_NAME", "Aria")
    AGENT_COMPANY: str = os.environ.get("AGENT_COMPANY", "our company")

    def validate(self) -> None:
        if not self.SARVAM_API_KEY:
            raise ValueError(
                "\n\n✗ SARVAM_API_KEY is not set.\n"
                "  Get a free key at https://dashboard.sarvam.ai\n"
                "  Add it to backend/.env\n"
            )
        print(f"✅ Config OK | Model: {self.SARVAM_MODEL} | Voice: {self.EDGE_TTS_VOICE}")


settings = Settings()