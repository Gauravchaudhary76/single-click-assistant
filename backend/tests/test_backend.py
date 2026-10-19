import pytest
from fastapi.testclient import TestClient
import time
from app.main import app
from app.database.database import init_db
from app.services.gesture_classifier import EyeBlinkStateMachine

init_db()
client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["database"] == "connected"
    assert data["offline_ready"] is True

def test_request_creation_and_priorities():
    # Water -> LOW
    r1 = client.post("/api/requests", json={"type": "water"})
    assert r1.status_code == 201
    assert r1.json()["priority"] == "LOW"
    assert r1.json()["status"] == "NEW"

    # Pain -> MEDIUM
    r2 = client.post("/api/requests", json={"type": "pain"})
    assert r2.status_code == 201
    assert r2.json()["priority"] == "MEDIUM"

    # Emergency -> HIGH
    r3 = client.post("/api/requests", json={"type": "emergency"})
    assert r3.status_code == 201
    assert r3.json()["priority"] == "HIGH"

def test_duplicate_prevention():
    # Creating the exact same request within 5s returns existing request
    r_initial = client.post("/api/requests", json={"type": "food"})
    assert r_initial.status_code == 201
    first_id = r_initial.json()["id"]

    # Immediate duplicate request
    r_dup = client.post("/api/requests", json={"type": "food"})
    assert r_dup.status_code == 201
    assert r_dup.json()["id"] == first_id

def test_caregiver_workflow():
    # Create a washroom request
    created = client.post("/api/requests", json={"type": "washroom"}).json()
    req_id = created["id"]
    assert created["status"] == "NEW"

    # Acknowledge request
    ack_res = client.patch(f"/api/requests/{req_id}/acknowledge")
    assert ack_res.status_code == 200
    ack_data = ack_res.json()
    assert ack_data["status"] == "ACKNOWLEDGED"
    assert ack_data["acknowledged_at"] is not None

    # Resolve request
    res_res = client.patch(f"/api/requests/{req_id}/resolve", json={"resolution_note": "Assistance finished"})
    assert res_res.status_code == 200
    res_data = res_res.json()
    assert res_data["status"] == "RESOLVED"
    assert res_data["resolved_at"] is not None
    assert "Assistance finished" in res_data["resolution_note"]

def test_smart_room_control():
    # Turn light on with brightness 75
    l_res = client.patch("/api/room/light", json={"light_on": True, "light_brightness": 75})
    assert l_res.status_code == 200
    assert l_res.json()["light_on"] is True
    assert l_res.json()["light_brightness"] == 75

    # Turn fan to speed 4
    f_res = client.patch("/api/room/fan", json={"fan_on": True, "fan_speed": 4})
    assert f_res.status_code == 200
    assert f_res.json()["fan_on"] is True
    assert f_res.json()["fan_speed"] == 4

    # Verify persistent state via GET /api/room
    room_get = client.get("/api/room")
    assert room_get.status_code == 200
    assert room_get.json()["light_on"] is True
    assert room_get.json()["fan_speed"] == 4

def test_settings_persistence():
    # Update EAR threshold and speech rate
    update_res = client.patch("/api/settings", json={"ear_threshold": 0.25, "speech_rate": 1.2})
    assert update_res.status_code == 200
    assert update_res.json()["ear_threshold"] == 0.25
    assert update_res.json()["speech_rate"] == 1.2

    # Verify retrieval
    get_res = client.get("/api/settings")
    assert get_res.status_code == 200
    assert get_res.json()["ear_threshold"] == 0.25
    assert get_res.json()["speech_rate"] == 1.2

def test_invalid_api_requests():
    # Invalid request type
    bad_req = client.post("/api/requests", json={"type": "invalid_type_xyz"})
    assert bad_req.status_code == 400

    # Non-existent request ID
    not_found = client.get("/api/requests/non_existent_uuid_12345")
    assert not_found.status_code == 404

    # Invalid fan speed (> 5)
    bad_fan = client.patch("/api/room/fan", json={"fan_speed": 10})
    assert bad_fan.status_code == 422

def test_gesture_state_machine_logic():
    fsm = EyeBlinkStateMachine(
        short_min_ms=150,
        short_max_ms=650,
        medium_min_ms=700,
        medium_max_ms=1800,
        long_min_ms=2000,
        debounce_ms=200
    )

    t0 = 1000.0
    # Eyes open initially
    status, gesture, _ = fsm.process_eye_state(eyes_closed=False, timestamp=t0)
    assert gesture is None
    assert status == "Eyes Open"

    # Eyes close for 300ms (short blink)
    fsm.process_eye_state(eyes_closed=True, timestamp=t0 + 0.05)
    status, gesture, duration = fsm.process_eye_state(eyes_closed=False, timestamp=t0 + 0.35)
    assert gesture == "NEXT"
    assert 250 <= duration <= 350

    # Test cooldown: immediate blink during cooldown is ignored
    fsm.process_eye_state(eyes_closed=True, timestamp=t0 + 0.40)
    _, g_cool, _ = fsm.process_eye_state(eyes_closed=False, timestamp=t0 + 0.45)
    assert g_cool is None

    # Medium blink after cooldown (1000ms duration)
    t1 = t0 + 1.0
    fsm.process_eye_state(eyes_closed=True, timestamp=t1)
    status, gesture, duration = fsm.process_eye_state(eyes_closed=False, timestamp=t1 + 1.0)
    assert gesture == "SELECT"
    assert 950 <= duration <= 1050

    # Long closure (> 2000ms)
    t2 = t1 + 2.0
    fsm.process_eye_state(eyes_closed=True, timestamp=t2)
    # At 2100ms while still closed, triggers CANCEL early
    status, gesture, duration = fsm.process_eye_state(eyes_closed=True, timestamp=t2 + 2.1)
    assert gesture == "CANCEL"

def test_demo_dataset_seeding_and_reset():
    # Seed demo data
    seed_res = client.post("/api/settings/seed-demo")
    assert seed_res.status_code == 200

    # Verify requests has demo entries
    reqs = client.get("/api/requests").json()
    demo_reqs = [r for r in reqs if r["is_demo"]]
    assert len(demo_reqs) > 0

    # Reset demo data
    reset_res = client.post("/api/settings/reset-demo")
    assert reset_res.status_code == 200

    # Verify demo requests are cleared
    reqs_after = client.get("/api/requests").json()
    demo_reqs_after = [r for r in reqs_after if r["is_demo"]]
    assert len(demo_reqs_after) == 0
