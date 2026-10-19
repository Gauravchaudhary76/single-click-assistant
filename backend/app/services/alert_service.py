import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from app.database.database import get_db, log_event
from app.models.schemas import RequestCreate, RequestResponse, RequestUpdate

PRIORITY_MAP = {
    "water": "LOW",
    "food": "LOW",
    "help": "LOW",
    "pain": "MEDIUM",
    "washroom": "MEDIUM",
    "emergency": "HIGH",
}

TITLE_MAP = {
    "water": "Request Water",
    "food": "Request Food",
    "pain": "Pain or Discomfort Alert",
    "washroom": "Washroom Assistance",
    "help": "General Assistance Needed",
    "emergency": "EMERGENCY ASSISTANCE REQUESTED",
}

class AlertService:
    @staticmethod
    def create_request(req_in: RequestCreate) -> RequestResponse:
        conn = get_db()
        cursor = conn.cursor()
        
        req_type = req_in.type.lower().strip()
        priority = req_in.priority.upper() if req_in.priority else PRIORITY_MAP.get(req_type, "MEDIUM")
        title = req_in.title if req_in.title else TITLE_MAP.get(req_type, f"Assistance: {req_type.capitalize()}")

        # Duplicate prevention: Check if identical request made in last 5 seconds with status NEW
        five_sec_ago = (datetime.now(timezone.utc) - timedelta(seconds=5)).isoformat()
        cursor.execute("""
        SELECT id FROM requests
        WHERE type = ? AND status = 'NEW' AND created_at >= ?
        LIMIT 1
        """, (req_type, five_sec_ago))
        existing = cursor.fetchone()
        if existing:
            # Return existing request instead of duplicating
            cursor.execute("SELECT * FROM requests WHERE id = ?", (existing["id"],))
            row = cursor.fetchone()
            conn.close()
            return RequestResponse(
                id=row["id"],
                type=row["type"],
                title=row["title"],
                priority=row["priority"],
                status=row["status"],
                created_at=row["created_at"],
                acknowledged_at=row["acknowledged_at"],
                resolved_at=row["resolved_at"],
                resolution_note=row["resolution_note"],
                is_demo=bool(row["is_demo"])
            )

        req_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        is_demo_int = 1 if req_in.is_demo else 0

        cursor.execute("""
        INSERT INTO requests (id, type, title, priority, status, created_at, is_demo)
        VALUES (?, ?, ?, ?, 'NEW', ?, ?)
        """, (req_id, req_type, title, priority, now, is_demo_int))
        conn.commit()
        conn.close()

        # Log event
        event_type = "emergency_alert" if priority == "HIGH" else "patient_request"
        status_color = "DANGER" if priority == "HIGH" else ("WARNING" if priority == "MEDIUM" else "INFO")
        log_event(
            event_type=event_type,
            description=f"Patient Triggered: {title} ({priority} Priority)",
            priority=priority,
            status=status_color,
            meta={"request_id": req_id, "type": req_type},
            is_demo=is_demo_int
        )

        return RequestResponse(
            id=req_id,
            type=req_type,
            title=title,
            priority=priority,
            status="NEW",
            created_at=now,
            is_demo=req_in.is_demo
        )

    @staticmethod
    def get_requests(status: Optional[str] = None, limit: int = 50) -> List[RequestResponse]:
        conn = get_db()
        cursor = conn.cursor()
        if status:
            cursor.execute("""
            SELECT * FROM requests
            WHERE status = ?
            ORDER BY created_at DESC LIMIT ?
            """, (status.upper(), limit))
        else:
            cursor.execute("""
            SELECT * FROM requests
            ORDER BY created_at DESC LIMIT ?
            """, (limit,))
        rows = cursor.fetchall()
        conn.close()

        return [
            RequestResponse(
                id=r["id"],
                type=r["type"],
                title=r["title"],
                priority=r["priority"],
                status=r["status"],
                created_at=r["created_at"],
                acknowledged_at=r["acknowledged_at"],
                resolved_at=r["resolved_at"],
                resolution_note=r["resolution_note"],
                is_demo=bool(r["is_demo"])
            )
            for r in rows
        ]

    @staticmethod
    def get_request_by_id(req_id: str) -> Optional[RequestResponse]:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM requests WHERE id = ?", (req_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return RequestResponse(
            id=row["id"],
            type=row["type"],
            title=row["title"],
            priority=row["priority"],
            status=row["status"],
            created_at=row["created_at"],
            acknowledged_at=row["acknowledged_at"],
            resolved_at=row["resolved_at"],
            resolution_note=row["resolution_note"],
            is_demo=bool(row["is_demo"])
        )

    @staticmethod
    def acknowledge_request(req_id: str) -> Optional[RequestResponse]:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM requests WHERE id = ?", (req_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return None

        now = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
        UPDATE requests
        SET status = 'ACKNOWLEDGED', acknowledged_at = ?
        WHERE id = ?
        """, (now, req_id))
        conn.commit()
        conn.close()

        log_event(
            event_type="caregiver_ack",
            description=f"Caregiver Acknowledged: {row['title']}",
            priority=row["priority"],
            status="SUCCESS",
            meta={"request_id": req_id, "acknowledged_at": now}
        )
        return AlertService.get_request_by_id(req_id)

    @staticmethod
    def resolve_request(req_id: str, note: Optional[str] = None) -> Optional[RequestResponse]:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM requests WHERE id = ?", (req_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return None

        now = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
        UPDATE requests
        SET status = 'RESOLVED', resolved_at = ?, resolution_note = ?
        WHERE id = ?
        """, (now, note or "Assistance provided successfully", req_id))
        conn.commit()
        conn.close()

        log_event(
            event_type="alert_resolved",
            description=f"Request Resolved: {row['title']}",
            priority="INFO",
            status="SUCCESS",
            meta={"request_id": req_id, "resolved_at": now, "note": note}
        )
        return AlertService.get_request_by_id(req_id)

    @staticmethod
    def cancel_request(req_id: str) -> Optional[RequestResponse]:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM requests WHERE id = ?", (req_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return None

        now = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
        UPDATE requests
        SET status = 'CANCELLED', resolved_at = ?, resolution_note = 'Cancelled by user or caregiver'
        WHERE id = ?
        """, (now, req_id))
        conn.commit()
        conn.close()

        log_event(
            event_type="alert_resolved",
            description=f"Request Cancelled: {row['title']}",
            priority="INFO",
            status="WARNING",
            meta={"request_id": req_id}
        )
        return AlertService.get_request_by_id(req_id)

    @staticmethod
    def get_caregiver_alerts() -> Dict[str, Any]:
        """Returns active requests categorized with escalation status"""
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
        SELECT * FROM requests
        WHERE status IN ('NEW', 'ACKNOWLEDGED')
        ORDER BY 
            CASE priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
            created_at DESC
        """)
        rows = cursor.fetchall()

        # Get escalation timeout setting
        cursor.execute("SELECT emergency_escalation_timeout_sec FROM settings WHERE id = 1")
        setting_row = cursor.fetchone()
        escalation_timeout = setting_row["emergency_escalation_timeout_sec"] if setting_row else 60
        conn.close()

        now = datetime.now(timezone.utc)
        alerts = []
        emergency_count = 0

        for r in rows:
            created_dt = datetime.fromisoformat(r["created_at"])
            elapsed_sec = int((now - created_dt).total_seconds())
            is_escalated = (r["priority"] in ("HIGH", "MEDIUM")) and (r["status"] == "NEW") and (elapsed_sec > escalation_timeout)
            
            if r["priority"] == "HIGH" and r["status"] == "NEW":
                emergency_count += 1

            alerts.append({
                "id": r["id"],
                "type": r["type"],
                "title": r["title"],
                "priority": r["priority"],
                "status": r["status"],
                "created_at": r["created_at"],
                "acknowledged_at": r["acknowledged_at"],
                "resolved_at": r["resolved_at"],
                "elapsed_seconds": elapsed_sec,
                "is_escalated": is_escalated,
                "escalation_message": "SIMULATED ESCALATION WARNING: Request unacknowledged beyond threshold. Software escalation triggered." if is_escalated else None,
                "is_demo": bool(r["is_demo"])
            })

        return {
            "alerts": alerts,
            "emergency_count": emergency_count,
            "total_active": len(alerts),
            "escalation_timeout_sec": escalation_timeout
        }

alert_service = AlertService()
