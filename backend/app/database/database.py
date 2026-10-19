import sqlite3
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from app.core.config import DB_PATH

def get_db():
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Requests table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        acknowledged_at TEXT,
        resolved_at TEXT,
        resolution_note TEXT,
        is_demo INTEGER DEFAULT 0
    )
    """)

    # Events table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        meta_json TEXT,
        is_demo INTEGER DEFAULT 0
    )
    """)

    # Room state table (single-row record)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS room_state (
        id INTEGER PRIMARY KEY,
        light_on INTEGER NOT NULL DEFAULT 0,
        light_brightness INTEGER NOT NULL DEFAULT 80,
        fan_on INTEGER NOT NULL DEFAULT 0,
        fan_speed INTEGER NOT NULL DEFAULT 2,
        updated_at TEXT NOT NULL
    )
    """)

    # Settings table (single-row record)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY,
        ear_threshold REAL NOT NULL DEFAULT 0.22,
        short_blink_min_ms INTEGER NOT NULL DEFAULT 150,
        short_blink_max_ms INTEGER NOT NULL DEFAULT 650,
        medium_blink_min_ms INTEGER NOT NULL DEFAULT 700,
        medium_blink_max_ms INTEGER NOT NULL DEFAULT 1800,
        long_blink_min_ms INTEGER NOT NULL DEFAULT 2000,
        debounce_ms INTEGER NOT NULL DEFAULT 400,
        speech_enabled INTEGER NOT NULL DEFAULT 1,
        speech_rate REAL NOT NULL DEFAULT 1.0,
        speech_volume REAL NOT NULL DEFAULT 1.0,
        audio_alerts_enabled INTEGER NOT NULL DEFAULT 1,
        emergency_escalation_timeout_sec INTEGER NOT NULL DEFAULT 60,
        high_contrast_mode INTEGER NOT NULL DEFAULT 0,
        demo_mode INTEGER NOT NULL DEFAULT 0,
        menu_timeout_sec INTEGER NOT NULL DEFAULT 15,
        updated_at TEXT NOT NULL
    )
    """)

    # Check and initialize room state default
    cursor.execute("SELECT COUNT(*) as cnt FROM room_state WHERE id = 1")
    if cursor.fetchone()["cnt"] == 0:
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
        INSERT INTO room_state (id, light_on, light_brightness, fan_on, fan_speed, updated_at)
        VALUES (1, 0, 80, 0, 0, ?)
        """, (now,))

    # Check and initialize settings default
    cursor.execute("SELECT COUNT(*) as cnt FROM settings WHERE id = 1")
    if cursor.fetchone()["cnt"] == 0:
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
        INSERT INTO settings (
            id, ear_threshold, short_blink_min_ms, short_blink_max_ms,
            medium_blink_min_ms, medium_blink_max_ms, long_blink_min_ms,
            debounce_ms, speech_enabled, speech_rate, speech_volume,
            audio_alerts_enabled, emergency_escalation_timeout_sec,
            high_contrast_mode, demo_mode, menu_timeout_sec, updated_at
        ) VALUES (
            1, 0.22, 150, 650, 700, 1800, 2000, 400, 1, 1.0, 1.0, 1, 60, 0, 0, 15, ?
        )
        """, (now,))

    conn.commit()
    conn.close()

def log_event(event_type: str, description: str, priority: str = "INFO", status: str = "INFO", meta: Optional[Dict[str, Any]] = None, is_demo: int = 0):
    import uuid
    conn = get_db()
    cursor = conn.cursor()
    event_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    meta_str = json.dumps(meta) if meta else None
    cursor.execute("""
    INSERT INTO events (id, type, description, priority, status, timestamp, meta_json, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (event_id, event_type, description, priority, status, now, meta_str, is_demo))
    conn.commit()
    conn.close()
    return event_id
