from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class RequestCreate(BaseModel):
    type: str = Field(..., description="Request type: water, food, pain, washroom, help, emergency")
    title: Optional[str] = None
    priority: Optional[str] = None
    is_demo: bool = False

class RequestResponse(BaseModel):
    id: str
    type: str
    title: str
    priority: str
    status: str
    created_at: str
    acknowledged_at: Optional[str] = None
    resolved_at: Optional[str] = None
    resolution_note: Optional[str] = None
    is_demo: bool = False

class RequestUpdate(BaseModel):
    status: Optional[str] = None
    resolution_note: Optional[str] = None

class EventResponse(BaseModel):
    id: str
    type: str
    description: str
    priority: str
    status: str
    timestamp: str
    meta_json: Optional[str] = None
    is_demo: bool = False

class RoomStateResponse(BaseModel):
    light_on: bool
    light_brightness: int
    fan_on: bool
    fan_speed: int
    updated_at: str

class LightUpdate(BaseModel):
    light_on: Optional[bool] = None
    light_brightness: Optional[int] = Field(None, ge=0, le=100)

class FanUpdate(BaseModel):
    fan_on: Optional[bool] = None
    fan_speed: Optional[int] = Field(None, ge=0, le=5)

class SettingsResponse(BaseModel):
    ear_threshold: float
    short_blink_min_ms: int
    short_blink_max_ms: int
    medium_blink_min_ms: int
    medium_blink_max_ms: int
    long_blink_min_ms: int
    debounce_ms: int
    speech_enabled: bool
    speech_rate: float
    speech_volume: float
    audio_alerts_enabled: bool
    emergency_escalation_timeout_sec: int
    high_contrast_mode: bool
    demo_mode: bool
    menu_timeout_sec: int
    updated_at: str

class SettingsUpdate(BaseModel):
    ear_threshold: Optional[float] = None
    short_blink_min_ms: Optional[int] = None
    short_blink_max_ms: Optional[int] = None
    medium_blink_min_ms: Optional[int] = None
    medium_blink_max_ms: Optional[int] = None
    long_blink_min_ms: Optional[int] = None
    debounce_ms: Optional[int] = None
    speech_enabled: Optional[bool] = None
    speech_rate: Optional[float] = None
    speech_volume: Optional[float] = None
    audio_alerts_enabled: Optional[bool] = None
    emergency_escalation_timeout_sec: Optional[int] = None
    high_contrast_mode: Optional[bool] = None
    demo_mode: Optional[bool] = None
    menu_timeout_sec: Optional[int] = None

class DashboardStatsResponse(BaseModel):
    system_status: str
    webcam_status: str
    detection_status: str
    requests_today: int
    emergency_alerts_count: int
    caregiver_acknowledgements: int
    last_detected_action: Optional[str] = None
    last_action_timestamp: Optional[str] = None
    room_light_on: bool
    room_fan_speed: int
    active_mode: str
    recent_activity: List[EventResponse]

class FrameProcessRequest(BaseModel):
    image_base64: str

class FrameProcessResponse(BaseModel):
    face_detected: bool
    left_ear: float
    right_ear: float
    avg_ear: float
    eye_status: str  # "Eyes Open", "Eyes Closed", "Blink Detected"
    blink_count: int
    gesture_detected: Optional[str] = None # "NEXT", "SELECT", "CANCEL", None
    gesture_description: Optional[str] = None
    landmarks_preview: Optional[List[List[float]]] = None

class SimulateGestureRequest(BaseModel):
    gesture: str  # "NEXT", "SELECT", "CANCEL", "EMERGENCY"
