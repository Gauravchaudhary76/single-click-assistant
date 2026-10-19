from datetime import datetime, timezone
from typing import Optional
from app.database.database import get_db, log_event
from app.models.schemas import RoomStateResponse

class RoomSimulatorService:
    @staticmethod
    def get_state() -> RoomStateResponse:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT light_on, light_brightness, fan_on, fan_speed, updated_at FROM room_state WHERE id = 1")
        row = cursor.fetchone()
        conn.close()
        if not row:
            return RoomStateResponse(
                light_on=False,
                light_brightness=80,
                fan_on=False,
                fan_speed=0,
                updated_at=datetime.now(timezone.utc).isoformat()
            )
        return RoomStateResponse(
            light_on=bool(row["light_on"]),
            light_brightness=row["light_brightness"],
            fan_on=bool(row["fan_on"]),
            fan_speed=row["fan_speed"],
            updated_at=row["updated_at"]
        )

    @staticmethod
    def update_light(light_on: Optional[bool] = None, brightness: Optional[int] = None) -> RoomStateResponse:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT light_on, light_brightness FROM room_state WHERE id = 1")
        row = cursor.fetchone()
        
        current_on = bool(row["light_on"]) if row else False
        current_brightness = row["light_brightness"] if row else 80

        new_on = light_on if light_on is not None else current_on
        new_brightness = brightness if brightness is not None else current_brightness
        now = datetime.now(timezone.utc).isoformat()

        cursor.execute("""
        UPDATE room_state
        SET light_on = ?, light_brightness = ?, updated_at = ?
        WHERE id = 1
        """, (1 if new_on else 0, new_brightness, now))
        conn.commit()
        conn.close()

        action = f"Light turned {'ON' if new_on else 'OFF'}" + (f" ({new_brightness}%)" if new_on else "")
        log_event(
            event_type="room_command",
            description=f"Smart Room: {action}",
            priority="INFO",
            status="SUCCESS",
            meta={"device": "light", "light_on": new_on, "brightness": new_brightness}
        )
        return RoomSimulatorService.get_state()

    @staticmethod
    def update_fan(fan_on: Optional[bool] = None, speed: Optional[int] = None) -> RoomStateResponse:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT fan_on, fan_speed FROM room_state WHERE id = 1")
        row = cursor.fetchone()

        current_on = bool(row["fan_on"]) if row else False
        current_speed = row["fan_speed"] if row else 0

        new_on = fan_on if fan_on is not None else current_on
        new_speed = speed if speed is not None else current_speed

        if new_speed > 0:
            new_on = True
        elif new_speed == 0:
            new_on = False

        now = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
        UPDATE room_state
        SET fan_on = ?, fan_speed = ?, updated_at = ?
        WHERE id = 1
        """, (1 if new_on else 0, new_speed, now))
        conn.commit()
        conn.close()

        action = f"Fan speed set to {new_speed}" if new_on else "Fan turned OFF"
        log_event(
            event_type="room_command",
            description=f"Smart Room: {action}",
            priority="INFO",
            status="SUCCESS",
            meta={"device": "fan", "fan_on": new_on, "speed": new_speed}
        )
        return RoomSimulatorService.get_state()

room_simulator = RoomSimulatorService()
