# Single-Click Assistant for Paralyzed Patients
### An Eye-Blink Controlled Smart Assistance and Caregiver Alert System (Software-Only Prototype)

> **Department of Electronics and Communication Engineering**  
> **National Institute of Technology, Manipur**  
> **B.Tech Project (2026-27)**  
> **Authors:** Gaurav Kumar Chaudhary (23105026), Rahul Deb (23105031), Dilkhush Raj (23105008)  
> **Project Guide:** Prof. L. Lolitkumar Singh

---

## 1. Project Overview & Role
**Single-Click Assistant** is an offline-first, software-only assistive healthcare application designed for individuals with severe motor paralysis (such as locked-in syndrome or advanced ALS) who have preserved voluntary eye movement.

Using standard laptop or desktop computer webcams, the system leverages real-time facial landmark detection and **Eye Aspect Ratio (EAR)** calculations to classify intentional eye-blink gestures. Patients can navigate an audio-guided menu, communicate immediate physical needs (water, food, washroom, pain), trigger high-priority emergency alerts, control simulated room appliances (lighting and fan speed), and receive spoken audio feedback—all without requiring physical switches, Raspberry Pi, relays, or cloud dependencies.

---

## 2. Technical Architecture & Technology Stack

```
   [ Patient Eye Blinks ]
             │
             ▼
   [ Standard PC Webcam ] ──> 640x480 / 30fps Video Stream
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ Computer Vision & Perception Pipeline (MediaPipe + OpenCV)  │
│ 1. Face Landmark Mesh (478 3D Landmarks)                    │
│ 2. Landmark Contours: Left Eye [33..144], Right Eye [362..] │
│ 3. Soukupová & Čech (2016) Eye Aspect Ratio (EAR)           │
│ 4. MediaPipe Blendshape Eye Closure Verification            │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ Finite State Machine (FSM) & Gesture Classifier             │
│ • Natural Blink (<150ms): Ignored (Twitch/Flutter debounce) │
│ • Short Intentional Blink (150-650ms): "NEXT" Menu Item     │
│ • Medium Intentional Blink (700-1800ms): "SELECT" Item      │
│ • Long Closure (>2000ms): "CANCEL / RESET" Confirmation    │
│ • Refractory Debounce Cooldown: 400ms Neutral State         │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ Application Core & Backend Services (FastAPI + SQLite)      │
│ • REST Endpoints (/api/requests, /api/room, /api/settings)  │
│ • WebSocket Telemetry & Gesture Broadcast (/api/vision/ws)  │
│ • Caregiver Alert Service with Simulated Escalation Timer   │
│ • Virtual Smart Room State Machine (Light, Fan Speed 0-5)   │
│ • SQLite Database Persistence (assistant.db)                │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ Accessible Presentation Layer (React 19 + TypeScript + Vite)│
│ • High-Contrast Healthcare Interface (Tailwind CSS)         │
│ • Spoken Prompts & Visual Subtitles (SpeechSynthesis API)  │
│ • Dual-Mode: Live Webcam Mode vs. Manual Simulation Mode    │
│ • 5-Step Guided Blink Calibration Wizard                    │
└─────────────────────────────────────────────────────────────┘
```

### Technology Matrix
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React icons.
- **Backend:** Python 3.13, FastAPI, Uvicorn, SQLite3, WebSockets.
- **Computer Vision:** OpenCV (`cv2`), Google MediaPipe (`mp.tasks.vision.FaceLandmarker` with `face_landmarker.task`), Eye Aspect Ratio algorithm.
- **Voice & Audio:** HTML5 Web SpeechSynthesis API, Web Audio API tone synthesizer (chimes & emergency siren).
- **Testing:** Pytest, HTTPX, FastAPI TestClient.

---

## 3. Mathematical Basis: Eye Aspect Ratio (EAR)

Following the benchmark methodology by Tereza Soukupová and Jan Čech (CVWW 2016):

$$\text{EAR} = \frac{\|p_2 - p_6\| + \|p_3 - p_5\|}{2 \|p_1 - p_4\|}$$

Where:
- $p_1, p_4$ are the horizontal eye corner landmarks.
- $p_2, p_6$ and $p_3, p_5$ are the pairs of vertical eyelid landmarks.

When eyes are open, the EAR hovers between **0.28 and 0.38**. When the patient intentionally closes their eyes, the EAR drops below the calibrated threshold ($\approx 0.22$).

---

## 4. Key Features & Implementation Status

| Feature | Implementation Details | Status |
|---|---|---|
| **1. Healthcare Dashboard** | Live KPI counters (requests today, active emergency alerts, caregiver acks, room status, recent activity feed) populated directly from SQLite. | Fully Implemented |
| **2. Real-Time Eye Blink Detection** | Live webcam stream with 478-point landmark tracking, live EAR meter, blink counter, and dynamic threshold indicator. | Fully Implemented |
| **3. Assistive Menu Navigation** | 4 Categories (Needs, Emergency, Entertainment, Smart Room). Visual highlight with focus ring, auto-read item speech, and emergency safety confirmation. | Fully Implemented |
| **4. Voice Assistant** | 100% offline text-to-speech feedback using Web SpeechSynthesis. Visual subtitle banner for hearing-impaired users. | Fully Implemented |
| **5. Virtual Smart Room** | Dynamic room visualizer with lighting opacity based on brightness slider (0-100%) and 4-blade ceiling fan spinning with CSS animation speed proportional to level (0-5). | Fully Implemented (Software Simulation) |
| **6. Caregiver Alert System** | Triaged alert queue with priority mapping (`LOW`, `MEDIUM`, `HIGH`). Acknowledge and resolve workflow with timestamps. | Fully Implemented |
| **7. Emergency Escalation** | Flashing red banner, Web Audio siren tone, and simulated escalation notice if emergency remains unacknowledged beyond configured timeout. | Fully Implemented (Software Simulation) |
| **8. Persistent Audit History** | SQLite database log recording gestures, commands, caregiver acknowledgments, and errors. Filterable by priority, type, and keyword. Exportable to CSV. | Fully Implemented |
| **9. Offline-First Operation** | Runs 100% locally on `localhost`. Zero external cloud AI or subscription dependencies required. | Fully Implemented |
| **10. Calibration & Settings** | 5-step guided calibration wizard to estimate patient-specific EAR thresholds, adjustable timing sliders, and high-contrast toggle. | Fully Implemented |
| **11. Demonstration Mode** | One-click button/shortcut simulation bar (Next, Select, Cancel, Direct SOS) to present without a webcam. Seed and reset sample dataset. | Fully Implemented |

---

## 5. Software Simulation Disclaimers

> [!IMPORTANT]
> **SIMULATION MODE — NO PHYSICAL DEVICES CONNECTED**  
> - **Virtual Appliances:** The smart light and ceiling fan are software simulations. The application does not control physical relays or 220V mains electricity.  
> - **Simulated Caregiver Paging:** Caregiver alerts and escalation warnings are software workflows operating within the local application. No cellular SMS or actual emergency dispatch services (e.g., 911 / 112) are contacted.  
> - **Educational Prototype:** This system is an engineering research prototype developed for academic demonstration and evaluation. It is not a certified medical device.

---

## 6. Installation & Startup Instructions

### Prerequisites
- Python 3.10+ (Tested on Python 3.13.3)
- Node.js v18+ and npm (Tested on Node v22.20.0)
- Laptop or desktop webcam (optional if using Manual Simulation mode)

### Option A: Single-Command Full-Stack Launch (Recommended)
FastAPI is pre-configured to automatically serve both the backend REST APIs and the pre-compiled frontend single-page application:

```powershell
# 1. Open a terminal in the backend directory
cd C:\Users\gaura\.gemini\antigravity\scratch\single-click-assistant\backend

# 2. Run the application server
python app/main.py
```

Now open your web browser to:
👉 **`http://localhost:8000`**

---

### Option B: Development Mode (Hot-Reloading)
To run frontend and backend with live hot-reloading:

**Terminal 1 (Backend):**
```powershell
cd C:\Users\gaura\.gemini\antigravity\scratch\single-click-assistant\backend
python app/main.py
```

**Terminal 2 (Frontend):**
```powershell
cd C:\Users\gaura\.gemini\antigravity\scratch\single-click-assistant\frontend
npm run dev
```

Now open your browser to:
👉 **`http://localhost:5173`**

---

## 7. Running Backend Automated Tests

To run the complete Pytest test suite:

```powershell
cd C:\Users\gaura\.gemini\antigravity\scratch\single-click-assistant\backend
python -m pytest tests/ -v
```

**Automated Test Coverage:**
- `test_health_check`: Verifies API and database connectivity.
- `test_request_creation_and_priorities`: Validates priority triage (`water` $\to$ LOW, `pain` $\to$ MEDIUM, `emergency` $\to$ HIGH).
- `test_duplicate_prevention`: Proves 5-second debounce window prevents double-triggering.
- `test_caregiver_workflow`: Validates state lifecycle (`NEW` $\to$ `ACKNOWLEDGED` $\to$ `RESOLVED`).
- `test_smart_room_control`: Tests persistence of light on/off, brightness, and fan speed levels (0-5).
- `test_settings_persistence`: Validates threshold adjustments saved to SQLite.
- `test_invalid_api_requests`: Tests 400, 404, and 422 HTTP error handling.
- `test_gesture_state_machine_logic`: Simulates timestamped eye closure durations for NEXT, SELECT, and CANCEL gestures.
- `test_demo_dataset_seeding_and_reset`: Tests isolation and clean reset of demonstration data.

---

## 8. College Project Demonstration Script (Viva / Presentation Workflow)

For an effective viva or project evaluation:

1. **Introduction & System Health (Dashboard Tab):**
   - Open `http://localhost:8000`.
   - Point out the active KPIs: Requests Today, Emergency Alerts, Caregiver Acks, and Mode Indicator.
   - Click **"Seed Demo Data"** in the top header to showcase populated historical activity.

2. **Demonstrating Assistive Menu Navigation (Eye-Blink Assistant Tab):**
   - Click **"Start Eye-Blink Assistant"**.
   - If using webcam:
     - Allow camera permissions.
     - Observe the live EAR meter and landmark mesh tracking your eyes.
     - Perform a **Short Intentional Blink** (~300ms): highlight moves from "Request Water" to "Request Food". Note the audio click and spoken prompt.
     - Perform a **Medium Intentional Blink** (~1s): executes "Request Food". Note the audio chime and spoken confirmation.
   - If demonstrating manually (without camera):
     - Press the `Spacebar` or `Right Arrow` to advance the highlight.
     - Press `Enter` to select.

3. **Demonstrating Emergency Safety Mechanism:**
   - Navigate to **"Emergency Assistance"** and select it.
   - Show that the system does **not** instantly trigger an emergency: it requires explicit confirmation to prevent false alarms due to fatigue.
   - Confirm selection: Notice the flashing red banner and siren buzzer.

4. **Demonstrating Virtual Smart Room (Smart Room Tab):**
   - Navigate to the **Smart Room** page.
   - Show the dynamic ceiling fan spinning with speed 1 through 5.
   - Adjust the brightness slider and show the virtual room walls, window, and lamp brightening dynamically.
   - Emphasize the safety disclaimer banner.

5. **Demonstrating Caregiver Dispatch Workflow (Caregiver Alerts Tab):**
   - Switch to the **Caregiver Alerts** tab.
   - Point out the active emergency request with live elapsed time ticker.
   - Click **"Acknowledge"**: the emergency siren stops immediately and the status transitions to `ACKNOWLEDGED`.
   - Click **"Resolve"**: enter a resolution note (e.g., "Assisted patient with meal") and complete the ticket.

6. **Demonstrating Audit History & CSV Export (Activity History Tab):**
   - Open **Activity History**.
   - Filter by `HIGH` priority or search for `Emergency`.
   - Click **"Export CSV"** to demonstrate clinical record export.

7. **Resetting to Clean State:**
   - Click **"Reset Demo"** in the header to purge sample data and return to clean live state.

---

## 9. Manual Webcam Testing Guide

| Test Case | Procedure | Expected Result | Pass/Fail Criteria |
|---|---|---|---|
| **TC-01: Camera Permission** | Click "Start Camera" on fresh browser session. | Browser modal requests webcam permission. | Video stream starts on Allow; descriptive error on Block. |
| **TC-02: Face Mesh Lock** | Center face in webcam frame. | Blue landmark points lock onto left and right eye contours. | `Face: Locked` status badge displayed. |
| **TC-03: Natural Blink Filtering** | Blink rapidly as in natural conversation. | Blink counter may register blink, but no menu jump occurs (duration < 150ms). | No accidental selection. |
| **TC-04: Intentional Short Blink** | Close eyes deliberately for ~0.3s and reopen. | Menu highlight jumps to next item. EAR drops below threshold and recovers. | "NEXT" menu transition occurs. |
| **TC-05: Intentional Medium Blink**| Close eyes deliberately for ~1s and reopen. | Highlighted item executes. Spoken voice confirmation plays. | "SELECT" action triggers. |
| **TC-06: Long Closure (Cancel)** | Keep eyes closed for >2 seconds. | Cancels pending action or resets menu. | "CANCEL" action triggers. |
| **TC-07: Low-Light & Eyeglasses** | Test with room lights dimmed and while wearing corrective glasses. | FaceLandmarker maintains eye contour tracking. | EAR responds to eye closure. |
| **TC-08: Camera Disconnection** | Disconnect external webcam during streaming. | System catches stream interruption and gracefully reverts to Standby. | No app crash or frozen UI. |

---

## 10. Summary of Project Outcomes
- **Complete Software-Only Operation:** Delivered without needing physical hardware, wiring, or Raspberry Pi.
- **Accurate Landmark-Based Perception:** Combines Soukupová & Čech EAR with MediaPipe FaceLandmarker blendshapes.
- **Accessible Healthcare Design:** High contrast, large hit areas, screen-reader friendly typography, and spoken audio.
- **Robust FSM & Duplicate Protection:** Eliminates double-triggers with a 400ms cooldown and 5-second request deduplication.
