from fastapi import APIRouter
from app.services.blink_detection import blink_detector
from app.database.database import get_db

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("")
def health_check():
    db_ok = False
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        db_ok = True
        conn.close()
    except Exception:
        db_ok = False

    return {
        "status": "online",
        "service": "Single-Click Assistant Backend",
        "database": "connected" if db_ok else "error",
        "vision_engine": "mediapipe" if blink_detector.is_initialized else "cascade_fallback",
        "model_loaded": blink_detector.is_initialized,
        "offline_ready": True
    }
