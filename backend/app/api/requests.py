from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from app.models.schemas import RequestCreate, RequestResponse, RequestUpdate
from app.services.alert_service import alert_service

router = APIRouter(prefix="/requests", tags=["Requests"])

@router.get("", response_model=List[RequestResponse])
def list_requests(status: Optional[str] = Query(None, description="Filter by status: NEW, ACKNOWLEDGED, RESOLVED, CANCELLED"), limit: int = 50):
    return alert_service.get_requests(status=status, limit=limit)

@router.post("", response_model=RequestResponse, status_code=201)
def create_patient_request(req_in: RequestCreate):
    valid_types = {"water", "food", "pain", "washroom", "help", "emergency"}
    if req_in.type.lower() not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid request type '{req_in.type}'. Allowed: {list(valid_types)}")
    return alert_service.create_request(req_in)

@router.get("/{req_id}", response_model=RequestResponse)
def get_request(req_id: str):
    req = alert_service.get_request_by_id(req_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    return req

@router.patch("/{req_id}/acknowledge", response_model=RequestResponse)
def acknowledge_request(req_id: str):
    updated = alert_service.acknowledge_request(req_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Request not found")
    return updated

@router.patch("/{req_id}/resolve", response_model=RequestResponse)
def resolve_request(req_id: str, body: Optional[RequestUpdate] = None):
    note = body.resolution_note if body else None
    updated = alert_service.resolve_request(req_id, note=note)
    if not updated:
        raise HTTPException(status_code=404, detail="Request not found")
    return updated

@router.patch("/{req_id}/cancel", response_model=RequestResponse)
def cancel_request(req_id: str):
    updated = alert_service.cancel_request(req_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Request not found")
    return updated
