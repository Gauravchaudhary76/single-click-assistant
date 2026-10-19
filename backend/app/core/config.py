import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "assistant.db"

class Settings(BaseModel):
    APP_NAME: str = "Single-Click Assistant"
    SUBTITLE: str = "Eye-Blink Controlled Smart Assistance System"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DB_URL: str = str(DB_PATH)
    CORS_ORIGINS: list[str] = ["*"]
    
    # Computer Vision Default Thresholds
    DEFAULT_EAR_THRESHOLD: float = 0.22
    DEFAULT_SHORT_BLINK_MIN_MS: int = 150
    DEFAULT_SHORT_BLINK_MAX_MS: int = 650
    DEFAULT_MEDIUM_BLINK_MIN_MS: int = 700
    DEFAULT_MEDIUM_BLINK_MAX_MS: int = 1800
    DEFAULT_LONG_BLINK_MIN_MS: int = 2000
    DEFAULT_DEBOUNCE_MS: int = 400
    
    # Caregiver Escalation Default (seconds)
    DEFAULT_ESCALATION_TIMEOUT_SEC: int = 60

settings = Settings()
