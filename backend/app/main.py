from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from pathlib import Path

from app.core.config import settings
from app.database.database import init_db, get_db
from app.services.blink_detection import blink_detector
from app.services.gesture_classifier import gesture_classifier
from app.api import health, dashboard, requests, caregiver, room, events, settings as settings_api, vision

FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

def sync_settings_from_db():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM settings WHERE id = 1")
        row = cursor.fetchone()
        conn.close()
        if row:
            blink_detector.set_ear_threshold(row["ear_threshold"])
            gesture_classifier.update_thresholds(
                short_min_ms=row["short_blink_min_ms"],
                short_max_ms=row["short_blink_max_ms"],
                medium_min_ms=row["medium_blink_min_ms"],
                medium_max_ms=row["medium_blink_max_ms"],
                long_min_ms=row["long_blink_min_ms"],
                debounce_ms=row["debounce_ms"],
            )
    except Exception as e:
        print(f"Warning: Could not sync settings from DB on startup: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite tables on startup
    init_db()
    sync_settings_from_db()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="Software-Only Eye-Blink Controlled Smart Assistance and Caregiver Alert System",
    version=settings.VERSION,
    lifespan=lifespan
)

# Enable CORS for frontend Vite dev server (usually localhost:5173) and local clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers under /api
app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_PREFIX)
app.include_router(requests.router, prefix=settings.API_PREFIX)
app.include_router(caregiver.router, prefix=settings.API_PREFIX)
app.include_router(room.router, prefix=settings.API_PREFIX)
app.include_router(events.router, prefix=settings.API_PREFIX)
app.include_router(settings_api.router, prefix=settings.API_PREFIX)
app.include_router(vision.router, prefix=settings.API_PREFIX)

# Serve frontend assets if built
if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

@app.get("/")
def root():
    if FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").exists():
        return FileResponse(FRONTEND_DIST / "index.html")
    return {
        "app": settings.APP_NAME,
        "subtitle": settings.SUBTITLE,
        "status": "online",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
