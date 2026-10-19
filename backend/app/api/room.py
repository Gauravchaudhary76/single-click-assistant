from fastapi import APIRouter
from app.models.schemas import RoomStateResponse, LightUpdate, FanUpdate
from app.services.room_simulator import room_simulator

router = APIRouter(prefix="/room", tags=["Smart Room"])

@router.get("", response_model=RoomStateResponse)
def get_room_state():
    return room_simulator.get_state()

@router.patch("/light", response_model=RoomStateResponse)
def update_light(body: LightUpdate):
    return room_simulator.update_light(light_on=body.light_on, brightness=body.light_brightness)

@router.patch("/fan", response_model=RoomStateResponse)
def update_fan(body: FanUpdate):
    return room_simulator.update_fan(fan_on=body.fan_on, speed=body.fan_speed)
