from fastapi import APIRouter
from datetime import datetime, timezone, timedelta
import uuid
from app.database.database import get_db, log_event
from app.models.schemas import SettingsResponse, SettingsUpdate
from app.services.blink_detection import blink_detector
from app.services.gesture_classifier import gesture_classifier

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("", response_model=SettingsResponse)
def get_settings():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM settings WHERE id = 1")
    row = cursor.fetchone()
    conn.close()

    return SettingsResponse(
        ear_threshold=row["ear_threshold"],
        short_blink_min_ms=row["short_blink_min_ms"],
        short_blink_max_ms=row["short_blink_max_ms"],
        medium_blink_min_ms=row["medium_blink_min_ms"],
        medium_blink_max_ms=row["medium_blink_max_ms"],
        long_blink_min_ms=row["long_blink_min_ms"],
        debounce_ms=row["debounce_ms"],
        speech_enabled=bool(row["speech_enabled"]),
        speech_rate=row["speech_rate"],
        speech_volume=row["speech_volume"],
        audio_alerts_enabled=bool(row["audio_alerts_enabled"]),
        emergency_escalation_timeout_sec=row["emergency_escalation_timeout_sec"],
        high_contrast_mode=bool(row["high_contrast_mode"]),
        demo_mode=bool(row["demo_mode"]),
        menu_timeout_sec=row["menu_timeout_sec"],
        updated_at=row["updated_at"]
    )

@router.patch("", response_model=SettingsResponse)
def update_settings(body: SettingsUpdate):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM settings WHERE id = 1")
    current = cursor.fetchone()

    now = datetime.now(timezone.utc).isoformat()

    ear_th = body.ear_threshold if body.ear_threshold is not None else current["ear_threshold"]
    short_min = body.short_blink_min_ms if body.short_blink_min_ms is not None else current["short_blink_min_ms"]
    short_max = body.short_blink_max_ms if body.short_blink_max_ms is not None else current["short_blink_max_ms"]
    med_min = body.medium_blink_min_ms if body.medium_blink_min_ms is not None else current["medium_blink_min_ms"]
    med_max = body.medium_blink_max_ms if body.medium_blink_max_ms is not None else current["medium_blink_max_ms"]
    long_min = body.long_blink_min_ms if body.long_blink_min_ms is not None else current["long_blink_min_ms"]
    deb = body.debounce_ms if body.debounce_ms is not None else current["debounce_ms"]
    sp_en = int(body.speech_enabled) if body.speech_enabled is not None else current["speech_enabled"]
    sp_rate = body.speech_rate if body.speech_rate is not None else current["speech_rate"]
    sp_vol = body.speech_volume if body.speech_volume is not None else current["speech_volume"]
    aud_en = int(body.audio_alerts_enabled) if body.audio_alerts_enabled is not None else current["audio_alerts_enabled"]
    esc_to = body.emergency_escalation_timeout_sec if body.emergency_escalation_timeout_sec is not None else current["emergency_escalation_timeout_sec"]
    hc_mod = int(body.high_contrast_mode) if body.high_contrast_mode is not None else current["high_contrast_mode"]
    dm_mod = int(body.demo_mode) if body.demo_mode is not None else current["demo_mode"]
    mn_to = body.menu_timeout_sec if body.menu_timeout_sec is not None else current["menu_timeout_sec"]

    cursor.execute("""
    UPDATE settings SET
        ear_threshold = ?, short_blink_min_ms = ?, short_blink_max_ms = ?,
        medium_blink_min_ms = ?, medium_blink_max_ms = ?, long_blink_min_ms = ?,
        debounce_ms = ?, speech_enabled = ?, speech_rate = ?, speech_volume = ?,
        audio_alerts_enabled = ?, emergency_escalation_timeout_sec = ?,
        high_contrast_mode = ?, demo_mode = ?, menu_timeout_sec = ?, updated_at = ?
    WHERE id = 1
    """, (
        ear_th, short_min, short_max, med_min, med_max, long_min,
        deb, sp_en, sp_rate, sp_vol, aud_en, esc_to,
        hc_mod, dm_mod, mn_to, now
    ))
    conn.commit()
    conn.close()

    # Synchronize live services with updated thresholds
    blink_detector.set_ear_threshold(ear_th)
    gesture_classifier.update_thresholds(
        short_min_ms=short_min,
        short_max_ms=short_max,
        medium_min_ms=med_min,
        medium_max_ms=med_max,
        long_min_ms=long_min,
        debounce_ms=deb
    )

    log_event(
        event_type="system_event",
        description="Configuration updated by user/calibration",
        priority="INFO",
        status="SUCCESS"
    )

    return get_settings()

@router.post("/seed-demo")
def seed_demo_data():
    """Generates an explicit demonstration dataset for college engineering presentation"""
    conn = get_db()
    cursor = conn.cursor()

    # Clear existing demo entries first
    cursor.execute("DELETE FROM requests WHERE is_demo = 1")
    cursor.execute("DELETE FROM events WHERE is_demo = 1")

    now = datetime.now(timezone.utc)

    # 1. Past resolved water request (35 mins ago)
    t1 = (now - timedelta(minutes=35)).isoformat()
    t1_ack = (now - timedelta(minutes=33)).isoformat()
    t1_res = (now - timedelta(minutes=28)).isoformat()
    cursor.execute("""
    INSERT INTO requests (id, type, title, priority, status, created_at, acknowledged_at, resolved_at, resolution_note, is_demo)
    VALUES (?, 'water', 'Request Water', 'LOW', 'RESOLVED', ?, ?, ?, 'Caregiver brought 200ml water glass', 1)
    """, (str(uuid.uuid4()), t1, t1_ack, t1_res))

    # 2. Acknowledged pain alert (15 mins ago)
    t2 = (now - timedelta(minutes=15)).isoformat()
    t2_ack = (now - timedelta(minutes=14)).isoformat()
    cursor.execute("""
    INSERT INTO requests (id, type, title, priority, status, created_at, acknowledged_at, resolved_at, resolution_note, is_demo)
    VALUES (?, 'pain', 'Pain or Discomfort Alert', 'MEDIUM', 'ACKNOWLEDGED', ?, ?, NULL, NULL, 1)
    """, (str(uuid.uuid4()), t2, t2_ack))

    # 3. Active unacknowledged emergency alert (simulate pending or escalating)
    t3 = (now - timedelta(seconds=75)).isoformat()
    cursor.execute("""
    INSERT INTO requests (id, type, title, priority, status, created_at, acknowledged_at, resolved_at, resolution_note, is_demo)
    VALUES (?, 'emergency', 'EMERGENCY ASSISTANCE REQUESTED', 'HIGH', 'NEW', ?, NULL, NULL, NULL, 1)
    """, (str(uuid.uuid4()), t3))

    # Seed corresponding demonstration events
    events_data = [
        ("system_event", "Demonstration Mode activated with calibrated profile", "INFO", "SUCCESS", (now - timedelta(minutes=40)).isoformat()),
        ("patient_request", "Patient Triggered: Request Water (LOW Priority)", "LOW", "INFO", t1),
        ("caregiver_ack", "Caregiver Acknowledged: Request Water", "LOW", "SUCCESS", t1_ack),
        ("alert_resolved", "Request Resolved: Request Water", "INFO", "SUCCESS", t1_res),
        ("room_command", "Smart Room: Light turned ON (85%)", "INFO", "SUCCESS", (now - timedelta(minutes=20)).isoformat()),
        ("patient_request", "Patient Triggered: Pain or Discomfort Alert (MEDIUM Priority)", "MEDIUM", "WARNING", t2),
        ("caregiver_ack", "Caregiver Acknowledged: Pain or Discomfort Alert", "MEDIUM", "SUCCESS", t2_ack),
        ("emergency_alert", "Patient Triggered: EMERGENCY ASSISTANCE REQUESTED (HIGH Priority)", "HIGH", "DANGER", t3),
    ]

    for ev in events_data:
        cursor.execute("""
        INSERT INTO events (id, type, description, priority, status, timestamp, meta_json, is_demo)
        VALUES (?, ?, ?, ?, ?, ?, NULL, 1)
        """, (str(uuid.uuid4()), ev[0], ev[1], ev[2], ev[3], ev[4]))

    # Set demo_mode = 1 in settings
    cursor.execute("UPDATE settings SET demo_mode = 1, updated_at = ? WHERE id = 1", (now.isoformat(),))

    conn.commit()
    conn.close()

    return {"message": "Demonstration dataset seeded successfully", "is_demo": True}

@router.post("/reset-demo")
def reset_demo_data():
    """Resets and purges demonstration data safely"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM requests WHERE is_demo = 1")
    cursor.execute("DELETE FROM events WHERE is_demo = 1")
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("UPDATE settings SET demo_mode = 0, updated_at = ? WHERE id = 1", (now,))
    conn.commit()
    conn.close()

    log_event(
        event_type="system_event",
        description="Demo data reset. System returned to live state.",
        priority="INFO",
        status="INFO"
    )

    return {"message": "Demo data reset successfully", "is_demo": False}
