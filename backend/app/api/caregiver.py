from fastapi import APIRouter
from app.services.alert_service import alert_service

router = APIRouter(prefix="/caregiver", tags=["Caregiver"])

@router.get("/alerts")
def get_caregiver_alerts():
    return alert_service.get_caregiver_alerts()
