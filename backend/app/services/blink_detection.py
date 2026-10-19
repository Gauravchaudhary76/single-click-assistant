import math
import base64
import time
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
import cv2
import numpy as np

import mediapipe as mp
from app.services.gesture_classifier import gesture_classifier

MODEL_PATH = Path(__file__).resolve().parent.parent / "models_data" / "face_landmarker.task"

# MediaPipe landmark indices for Soukupová & Čech (2016) EAR
LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]   # [p1, p2, p3, p4, p5, p6]
RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380] # [p1, p2, p3, p4, p5, p6]

def euclidean_dist(p1, p2) -> float:
    return math.hypot(p1[0] - p2[0], p1[1] - p2[1])

def calculate_ear(landmarks, indices, img_w: int, img_h: int) -> float:
    """
    Computes Eye Aspect Ratio (EAR):
    EAR = (|p2 - p6| + |p3 - p5|) / (2 * |p1 - p4|)
    """
    pts = []
    for idx in indices:
        lm = landmarks[idx]
        pts.append((lm.x * img_w, lm.y * img_h))

    p1, p2, p3, p4, p5, p6 = pts
    v1 = euclidean_dist(p2, p6)
    v2 = euclidean_dist(p3, p5)
    h = euclidean_dist(p1, p4)

    if h < 1e-6:
        return 0.0
    return (v1 + v2) / (2.0 * h)

class BlinkDetectionService:
    def __init__(self):
        self.landmarker = None
        self.ear_threshold = 0.22
        self.is_initialized = False
        self.init_error = None
        self.calibration_samples: List[float] = []
        self._init_landmarker()

    def _init_landmarker(self):
        try:
            if not MODEL_PATH.exists():
                self.init_error = f"Model file not found at {MODEL_PATH}"
                return

            BaseOptions = mp.tasks.BaseOptions
            FaceLandmarker = mp.tasks.vision.FaceLandmarker
            FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
            VisionRunningMode = mp.tasks.vision.RunningMode

            options = FaceLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=str(MODEL_PATH)),
                running_mode=VisionRunningMode.IMAGE,
                output_face_blendshapes=True,
                num_faces=1
            )
            self.landmarker = FaceLandmarker.create_from_options(options)
            self.is_initialized = True
        except Exception as e:
            self.init_error = str(e)
            self.is_initialized = False

    def set_ear_threshold(self, threshold: float):
        self.ear_threshold = max(0.10, min(0.40, threshold))

    def process_frame_data(self, b64_frame: str) -> Dict[str, Any]:
        """
        Decodes base64 image from frontend webcam, runs MediaPipe FaceLandmarker,
        computes EAR and runs gesture state machine.
        """
        now = time.time()
        
        # Decode base64 frame
        try:
            if "," in b64_frame:
                b64_frame = b64_frame.split(",", 1)[1]
            img_bytes = base64.b64decode(b64_frame)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            cv_img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if cv_img is None:
                return self._fallback_response("Failed to decode image frame")
        except Exception as e:
            return self._fallback_response(f"Image decode error: {e}")

        h, w, _ = cv_img.shape
        rgb_img = cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB)

        if not self.is_initialized or self.landmarker is None:
            # Fallback to OpenCV Haar cascade if landmarker unavailable
            return self._process_opencv_cascade(cv_img, now)

        try:
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_img)
            result = self.landmarker.detect(mp_image)

            if not result.face_landmarks:
                return {
                    "face_detected": False,
                    "left_ear": 0.0,
                    "right_ear": 0.0,
                    "avg_ear": 0.0,
                    "eye_status": "No Face Detected",
                    "blink_count": gesture_classifier.blink_count,
                    "gesture_detected": None,
                    "gesture_description": None,
                    "landmarks_preview": []
                }

            landmarks = result.face_landmarks[0]
            left_ear = calculate_ear(landmarks, LEFT_EYE_INDICES, w, h)
            right_ear = calculate_ear(landmarks, RIGHT_EYE_INDICES, w, h)
            avg_ear = (left_ear + right_ear) / 2.0

            # Also check blendshapes if present
            blendshape_closed = False
            if result.face_blendshapes and len(result.face_blendshapes) > 0:
                shapes = {b.category_name: b.score for b in result.face_blendshapes[0]}
                blink_l = shapes.get("eyeBlinkLeft", 0.0)
                blink_r = shapes.get("eyeBlinkRight", 0.0)
                if blink_l > 0.45 and blink_r > 0.45:
                    blendshape_closed = True

            eyes_closed = (avg_ear < self.ear_threshold) or blendshape_closed

            eye_status, gesture, duration_ms = gesture_classifier.process_eye_state(eyes_closed, timestamp=now)

            gesture_desc = None
            if gesture == "NEXT":
                gesture_desc = f"Short Blink ({int(duration_ms)}ms) -> Next Menu Item"
            elif gesture == "SELECT":
                gesture_desc = f"Medium Blink ({int(duration_ms)}ms) -> Select Item"
            elif gesture == "CANCEL":
                gesture_desc = f"Long Closure ({int(duration_ms)}ms) -> Cancel / Back"

            # Sample subset of eye landmarks for frontend visualization canvas
            preview_pts = []
            for idx in LEFT_EYE_INDICES + RIGHT_EYE_INDICES:
                lm = landmarks[idx]
                preview_pts.append([round(lm.x, 3), round(lm.y, 3)])

            return {
                "face_detected": True,
                "left_ear": round(left_ear, 3),
                "right_ear": round(right_ear, 3),
                "avg_ear": round(avg_ear, 3),
                "eye_status": eye_status,
                "blink_count": gesture_classifier.blink_count,
                "gesture_detected": gesture,
                "gesture_description": gesture_desc,
                "duration_ms": round(duration_ms, 1),
                "landmarks_preview": preview_pts
            }

        except Exception as e:
            return self._fallback_response(f"Landmark detection error: {e}")

    def _process_opencv_cascade(self, cv_img, now: float) -> Dict[str, Any]:
        """Resilient fallback using OpenCV's built-in cascades"""
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        if len(faces) == 0:
            return {
                "face_detected": False,
                "left_ear": 0.0,
                "right_ear": 0.0,
                "avg_ear": 0.0,
                "eye_status": "No Face Detected",
                "blink_count": gesture_classifier.blink_count,
                "gesture_detected": None,
                "gesture_description": None,
                "landmarks_preview": []
            }

        (x, y, w, h) = faces[0]
        roi_gray = gray[y:y + int(h * 0.6), x:x + w]
        eyes = eye_cascade.detectMultiScale(roi_gray, 1.1, 3)

        # In cascade detection, if face is detected but 0 eyes found in upper face region, eyes are likely closed!
        eyes_closed = (len(eyes) == 0)
        est_ear = 0.15 if eyes_closed else 0.30

        eye_status, gesture, duration_ms = gesture_classifier.process_eye_state(eyes_closed, timestamp=now)

        return {
            "face_detected": True,
            "left_ear": est_ear,
            "right_ear": est_ear,
            "avg_ear": est_ear,
            "eye_status": eye_status,
            "blink_count": gesture_classifier.blink_count,
            "gesture_detected": gesture,
            "gesture_description": f"Cascade Gesture: {gesture}" if gesture else None,
            "landmarks_preview": []
        }

    def _fallback_response(self, error_msg: str) -> Dict[str, Any]:
        return {
            "face_detected": False,
            "left_ear": 0.0,
            "right_ear": 0.0,
            "avg_ear": 0.0,
            "eye_status": "Error",
            "blink_count": gesture_classifier.blink_count,
            "gesture_detected": None,
            "gesture_description": error_msg,
            "landmarks_preview": []
        }

blink_detector = BlinkDetectionService()
