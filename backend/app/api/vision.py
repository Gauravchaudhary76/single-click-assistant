from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from typing import Dict, Any, List
import json
import asyncio
from app.models.schemas import FrameProcessRequest, FrameProcessResponse, SimulateGestureRequest, RequestCreate
from app.services.blink_detection import blink_detector
from app.services.gesture_classifier import gesture_classifier
from app.services.menu_controller import menu_controller
from app.services.alert_service import alert_service
from app.services.room_simulator import room_simulator
from app.database.database import log_event

router = APIRouter(prefix="/vision", tags=["Vision and Interaction"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)
        for dc in dead_connections:
            self.disconnect(dc)

ws_manager = ConnectionManager()

def execute_menu_action(item: dict) -> Dict[str, Any]:
    action = item.get("action")
    param = item.get("param")

    if action == "request":
        req = alert_service.create_request(RequestCreate(type=param))
        return {
            "type": "request_created",
            "request": req.model_dump(),
            "speech": f"Your request for {item['label']} has been recorded."
        }
    elif action == "room":
        if param == "light_on":
            state = room_simulator.update_light(light_on=True)
            return {"type": "room_updated", "room": state.model_dump(), "speech": "The light is now turned on."}
        elif param == "light_off":
            state = room_simulator.update_light(light_on=False)
            return {"type": "room_updated", "room": state.model_dump(), "speech": "The light is now turned off."}
        elif param == "fan_up":
            curr = room_simulator.get_state().fan_speed
            new_speed = min(5, curr + 1)
            state = room_simulator.update_fan(speed=new_speed)
            return {"type": "room_updated", "room": state.model_dump(), "speech": f"Fan speed has been increased to level {new_speed}."}
        elif param == "fan_down":
            curr = room_simulator.get_state().fan_speed
            new_speed = max(0, curr - 1)
            state = room_simulator.update_fan(speed=new_speed)
            return {"type": "room_updated", "room": state.model_dump(), "speech": f"Fan speed has been decreased to level {new_speed}."}
    elif action == "music":
        return {
            "type": "music_action",
            "command": param,
            "speech": f"Music command: {item['label']} executed."
        }
    return {"type": "unknown", "speech": "Command executed."}

@router.get("/status")
def get_vision_status():
    return {
        "engine": "MediaPipe FaceLandmarker" if blink_detector.is_initialized else "OpenCV Cascade Fallback",
        "model_loaded": blink_detector.is_initialized,
        "ear_threshold": blink_detector.ear_threshold,
        "blink_count": gesture_classifier.blink_count,
        "last_gesture": gesture_classifier.last_gesture,
        "fsm_state": gesture_classifier.state
    }

@router.get("/menu")
def get_menu_state():
    return menu_controller.get_state()

@router.post("/process-frame")
async def process_frame(payload: FrameProcessRequest):
    result = blink_detector.process_frame_data(payload.image_base64)
    gesture = result.get("gesture_detected")

    action_result = None
    menu_state = menu_controller.get_state()

    if gesture == "NEXT":
        menu_state = menu_controller.navigate_next()
        action_result = {
            "type": "navigation",
            "speech": menu_state["current_item"].get("spoken") or menu_state["current_item"].get("label")
        }
        log_event(
            event_type="menu_navigation",
            description=f"Menu Highlight: {menu_state['current_item']['label']}",
            priority="INFO",
            status="INFO"
        )
    elif gesture == "SELECT":
        menu_state, executed, speech_text = menu_controller.select_current()
        if executed:
            action_result = execute_menu_action(menu_state["current_item"])
            log_event(
                event_type="patient_request",
                description=f"Item Executed: {menu_state['current_item']['label']}",
                priority="INFO",
                status="SUCCESS"
            )
        else:
            action_result = {
                "type": "confirmation_required",
                "speech": speech_text or "Confirm Emergency Assistance? Select again to activate."
            }
            log_event("gesture_classified", "Emergency Confirmation Requested", "WARNING", "WARNING")
    elif gesture == "CANCEL":
        menu_state, speech_text = menu_controller.cancel_or_back()
        action_result = {
            "type": "cancel",
            "speech": speech_text
        }
        log_event(
            event_type="menu_navigation",
            description=speech_text,
            priority="INFO",
            status="WARNING"
        )

    response_payload = {
        **result,
        "menu_state": menu_state,
        "action_result": action_result
    }

    # Broadcast event if a gesture occurred
    if gesture:
        asyncio.create_task(ws_manager.broadcast({
            "event": "gesture",
            "gesture": gesture,
            "menu_state": menu_state,
            "action_result": action_result
        }))

    return response_payload

@router.post("/simulate-gesture")
async def simulate_gesture(payload: SimulateGestureRequest):
    """Allows manual demonstration of gestures (NEXT, SELECT, CANCEL, EMERGENCY)"""
    gesture = payload.gesture.upper().strip()
    action_result = None

    if gesture == "EMERGENCY":
        req = alert_service.create_request(RequestCreate(type="emergency"))
        action_result = {
            "type": "request_created",
            "request": req.model_dump(),
            "speech": "Emergency assistance has been requested!"
        }
        menu_state = menu_controller.get_state()
    elif gesture == "NEXT":
        menu_state = menu_controller.navigate_next()
        current_item = menu_state["current_item"]
        action_result = {
            "type": "navigation",
            "speech": current_item.get("spoken") or current_item.get("label")
        }
        log_event("gesture_classified", f"Manual Simulation: Next Menu Item ({current_item['label']})", "INFO", "INFO")
    elif gesture.startswith("SET_INDEX:"):
        try:
            target_idx = int(gesture.split(":", 1)[1])
            menu_state = menu_controller.set_index(target_idx)
            current_item = menu_state["current_item"]
            action_result = {
                "type": "index_set",
                "speech": current_item.get("spoken") or current_item.get("label")
            }
            log_event("gesture_classified", f"Manual Simulation: Focused {current_item['label']}", "INFO", "INFO")
        except (ValueError, IndexError):
            raise HTTPException(status_code=400, detail=f"Invalid SET_INDEX parameter: {gesture}")
    elif gesture == "SELECT":
        menu_state, executed, speech_text = menu_controller.select_current()
        if executed:
            action_result = execute_menu_action(menu_state["current_item"])
            log_event("gesture_classified", f"Manual Simulation: Selected {menu_state['current_item']['label']}", "INFO", "SUCCESS")
        else:
            action_result = {
                "type": "confirmation_required",
                "speech": speech_text or "Confirm Emergency Assistance? Select again to activate."
            }
            log_event("gesture_classified", "Manual Simulation: Emergency Confirmation Requested", "WARNING", "WARNING")
    elif gesture == "CANCEL":
        menu_state, speech_text = menu_controller.cancel_or_back()
        action_result = {
            "type": "cancel",
            "speech": speech_text
        }
        log_event("gesture_classified", f"Manual Simulation: Cancel / Back", "INFO", "WARNING")
    else:
        raise HTTPException(status_code=400, detail=f"Unknown gesture '{gesture}'")

    response_data = {
        "gesture": gesture,
        "menu_state": menu_state,
        "action_result": action_result
    }

    await ws_manager.broadcast({
        "event": "simulated_gesture",
        **response_data
    })

    return response_data

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial status
        await websocket.send_json({
            "event": "connected",
            "menu_state": menu_controller.get_state(),
            "status": "connected"
        })
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                # Handle client websocket messages if any
                if msg.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)
