from fastapi import APIRouter
from datetime import datetime, timezone
from app.database.database import get_db
from app.services.room_simulator import room_simulator
from app.services.blink_detection import blink_detector
from app.services.gesture_classifier import gesture_classifier

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("")
def get_dashboard_stats():
    conn = get_db()
    cursor = conn.cursor()

    # Get start of today (UTC)
    today_prefix = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    cursor.execute("""
    SELECT COUNT(*) as cnt FROM requests
    WHERE created_at LIKE ?
    """, (f"{today_prefix}%",))
    requests_today = cursor.fetchone()["cnt"]

    cursor.execute("""
    SELECT COUNT(*) as cnt FROM requests
    WHERE priority = 'HIGH' AND created_at LIKE ?
    """, (f"{today_prefix}%",))
    emergency_alerts_count = cursor.fetchone()["cnt"]

    cursor.execute("""
    SELECT COUNT(*) as cnt FROM requests
    WHERE status IN ('ACKNOWLEDGED', 'RESOLVED') AND (acknowledged_at LIKE ? OR created_at LIKE ?)
    """, (f"{today_prefix}%", f"{today_prefix}%"))
    caregiver_acknowledgements = cursor.fetchone()["cnt"]

    cursor.execute("""
    SELECT description, timestamp FROM events
    ORDER BY timestamp DESC LIMIT 1
    """)
    last_event = cursor.fetchone()
    last_action = last_event["description"] if last_event else "System Ready"
    last_action_ts = last_event["timestamp"] if last_event else None

    # Get recent 8 events
    cursor.execute("""
    SELECT * FROM events
    ORDER BY timestamp DESC LIMIT 8
    """)
    recent_rows = cursor.fetchall()

    # Get demo_mode setting
    cursor.execute("SELECT demo_mode FROM settings WHERE id = 1")
    setting_row = cursor.fetchone()
    demo_mode = bool(setting_row["demo_mode"]) if setting_row else False

    conn.close()

    room_state = room_simulator.get_state()

    recent_activity = [
        {
            "id": r["id"],
            "type": r["type"],
            "description": r["description"],
            "priority": r["priority"],
            "status": r["status"],
            "timestamp": r["timestamp"],
            "meta_json": r["meta_json"],
            "is_demo": bool(r["is_demo"])
        }
        for r in recent_rows
    ]

    return {
        "system_status": "Operational",
        "webcam_status": "Ready",
        "detection_status": "Active" if blink_detector.is_initialized else "Simulation",
        "requests_today": requests_today,
        "emergency_alerts_count": emergency_alerts_count,
        "caregiver_acknowledgements": caregiver_acknowledgements,
        "last_detected_action": last_action,
        "last_action_timestamp": last_action_ts,
        "room_light_on": room_state.light_on,
        "room_fan_speed": room_state.fan_speed,
        "active_mode": "Manual Simulation" if demo_mode else "Webcam Blink Control",
        "recent_activity": recent_activity
    }
