export type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type RequestStatus = 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CANCELLED';

export interface PatientRequest {
  id: string;
  type: string;
  title: string;
  priority: RequestPriority;
  status: RequestStatus;
  created_at: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  resolution_note?: string | null;
  elapsed_seconds?: number;
  is_escalated?: boolean;
  escalation_message?: string | null;
  is_demo?: boolean;
}

export interface ActivityEvent {
  id: string;
  type: string;
  description: string;
  priority: string;
  status: string;
  timestamp: string;
  meta_json?: string | null;
  is_demo?: boolean;
}

export interface RoomState {
  light_on: boolean;
  light_brightness: number;
  fan_on: boolean;
  fan_speed: number;
  updated_at: string;
}

export interface AppSettings {
  ear_threshold: number;
  short_blink_min_ms: number;
  short_blink_max_ms: number;
  medium_blink_min_ms: number;
  medium_blink_max_ms: number;
  long_blink_min_ms: number;
  debounce_ms: number;
  speech_enabled: boolean;
  speech_rate: number;
  speech_volume: number;
  audio_alerts_enabled: boolean;
  emergency_escalation_timeout_sec: number;
  high_contrast_mode: boolean;
  demo_mode: boolean;
  menu_timeout_sec: number;
  updated_at: string;
}

export interface DashboardStats {
  system_status: string;
  webcam_status: string;
  detection_status: string;
  requests_today: number;
  emergency_alerts_count: number;
  caregiver_acknowledgements: number;
  last_detected_action: string;
  last_action_timestamp?: string | null;
  room_light_on: boolean;
  room_fan_speed: number;
  active_mode: string;
  recent_activity: ActivityEvent[];
}

export interface MenuItem {
  id: string;
  label: string;
  spoken: string;
  action: string;
  param: string;
  category: string;
  is_emergency?: boolean;
}

export interface MenuCategory {
  id: string;
  title: string;
  items: MenuItem[];
}

export interface MenuState {
  active_index: number;
  total_items: number;
  current_item: MenuItem;
  pending_confirmation?: {
    item: MenuItem;
    prompt: string;
  } | null;
  menu_tree: MenuCategory[];
  flat_items: MenuItem[];
}

export interface BlinkTelemetry {
  face_detected: boolean;
  left_ear: number;
  right_ear: number;
  avg_ear: number;
  eye_status: string;
  blink_count: number;
  gesture_detected?: string | null;
  gesture_description?: string | null;
  duration_ms?: number;
  current_closure_ms?: number;
  landmarks_preview?: number[][];
}
