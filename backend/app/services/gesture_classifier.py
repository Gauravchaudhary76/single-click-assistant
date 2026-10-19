import time
from typing import Optional, Tuple, Dict, Any

class EyeBlinkStateMachine:
    """
    Mealy / Moore Finite State Machine for classifying intentional eye gestures.
    States:
      - IDLE (Eyes open, waiting)
      - CLOSURE_ACTIVE (Eyes currently closed, tracking duration)
      - COOLDOWN (Neutral refractory period preventing duplicate triggers)
    """

    def __init__(
        self,
        short_min_ms: int = 150,
        short_max_ms: int = 650,
        medium_min_ms: int = 700,
        medium_max_ms: int = 1800,
        long_min_ms: int = 2000,
        debounce_ms: int = 400
    ):
        self.short_min_ms = short_min_ms
        self.short_max_ms = short_max_ms
        self.medium_min_ms = medium_min_ms
        self.medium_max_ms = medium_max_ms
        self.long_min_ms = long_min_ms
        self.debounce_ms = debounce_ms

        self.state = "IDLE"
        self.closed_start_time: Optional[float] = None
        self.last_trigger_time: float = 0.0
        self.blink_count: int = 0
        self.last_gesture: Optional[str] = None
        self.last_gesture_duration_ms: float = 0.0

    def update_thresholds(
        self,
        short_min_ms: Optional[int] = None,
        short_max_ms: Optional[int] = None,
        medium_min_ms: Optional[int] = None,
        medium_max_ms: Optional[int] = None,
        long_min_ms: Optional[int] = None,
        debounce_ms: Optional[int] = None
    ):
        if short_min_ms is not None: self.short_min_ms = short_min_ms
        if short_max_ms is not None: self.short_max_ms = short_max_ms
        if medium_min_ms is not None: self.medium_min_ms = medium_min_ms
        if medium_max_ms is not None: self.medium_max_ms = medium_max_ms
        if long_min_ms is not None: self.long_min_ms = long_min_ms
        if debounce_ms is not None: self.debounce_ms = debounce_ms

    def process_eye_state(self, eyes_closed: bool, timestamp: Optional[float] = None) -> Tuple[str, Optional[str], float]:
        """
        Processes instantaneous eye state.
        Returns: (eye_status, gesture_detected, closure_duration_ms)
        gesture_detected can be "NEXT", "SELECT", "CANCEL", or None.
        """
        now = timestamp if timestamp is not None else time.time()
        gesture = None
        duration_ms = 0.0
        status = "Eyes Closed" if eyes_closed else "Eyes Open"

        # Check if in cooldown
        time_since_trigger_ms = (now - self.last_trigger_time) * 1000.0
        if self.state == "COOLDOWN":
            if time_since_trigger_ms >= self.debounce_ms:
                self.state = "IDLE"
            else:
                return status, None, 0.0

        if self.state == "IDLE":
            if eyes_closed:
                self.state = "CLOSURE_ACTIVE"
                self.closed_start_time = now
            return status, None, 0.0

        elif self.state == "CLOSURE_ACTIVE":
            if self.closed_start_time is None:
                self.closed_start_time = now

            current_duration_ms = (now - self.closed_start_time) * 1000.0

            # Early trigger for long closure (cancel/back) once threshold is crossed
            if eyes_closed and current_duration_ms >= self.long_min_ms:
                self.blink_count += 1
                gesture = "CANCEL"
                duration_ms = current_duration_ms
                self.last_gesture = gesture
                self.last_gesture_duration_ms = duration_ms
                self.last_trigger_time = now
                self.state = "COOLDOWN"
                self.closed_start_time = None
                return "Blink Detected", gesture, duration_ms

            # Eye reopened
            if not eyes_closed:
                duration_ms = current_duration_ms
                self.closed_start_time = None
                self.blink_count += 1

                # Classify duration
                if self.short_min_ms <= duration_ms <= self.short_max_ms:
                    gesture = "NEXT"
                elif self.medium_min_ms <= duration_ms <= self.medium_max_ms:
                    gesture = "SELECT"
                elif duration_ms > self.medium_max_ms:
                    # Ambiguous duration between medium_max and long_min: treat safely as None
                    gesture = None
                else:
                    # Very brief natural twitch / flutter (< short_min_ms): ignore
                    gesture = None

                if gesture:
                    self.last_gesture = gesture
                    self.last_gesture_duration_ms = duration_ms
                    self.last_trigger_time = now
                    self.state = "COOLDOWN"
                else:
                    self.state = "IDLE"

                return "Blink Detected" if gesture else "Eyes Open", gesture, duration_ms

        return status, None, 0.0

gesture_classifier = EyeBlinkStateMachine()
