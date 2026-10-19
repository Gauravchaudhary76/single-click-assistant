from fastapi import APIRouter, Query
from typing import Optional, List
from app.database.database import get_db
from app.models.schemas import EventResponse

router = APIRouter(prefix="/events", tags=["Activity History"])

@router.get("", response_model=List[EventResponse])
def get_events(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    priority: Optional[str] = Query(None, description="Filter by priority: LOW, MEDIUM, HIGH, INFO"),
    search: Optional[str] = Query(None, description="Search description text"),
    limit: int = 100,
    offset: int = 0
):
    conn = get_db()
    cursor = conn.cursor()

    query = "SELECT * FROM events WHERE 1=1"
    params = []

    if event_type:
        query += " AND type = ?"
        params.append(event_type)

    if priority:
        query += " AND priority = ?"
        params.append(priority.upper())

    if search:
        query += " AND description LIKE ?"
        params.append(f"%{search}%")

    query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    conn.close()

    return [
        EventResponse(
            id=r["id"],
            type=r["type"],
            description=r["description"],
            priority=r["priority"],
            status=r["status"],
            timestamp=r["timestamp"],
            meta_json=r["meta_json"],
            is_demo=bool(r["is_demo"])
        )
        for r in rows
    ]

@router.delete("")
def clear_events(keep_real: bool = False):
    conn = get_db()
    cursor = conn.cursor()
    if keep_real:
        cursor.execute("DELETE FROM events WHERE is_demo = 1")
    else:
        cursor.execute("DELETE FROM events")
    deleted_count = cursor.rowcount
    conn.commit()
    conn.close()
    return {"message": "Events cleared", "count": deleted_count}
