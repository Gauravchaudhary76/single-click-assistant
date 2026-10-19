import {
  AppSettings,
  DashboardStats,
  PatientRequest,
  ActivityEvent,
  RoomState,
  MenuState,
  BlinkTelemetry
} from '../types';

const API_BASE = 'http://localhost:8000/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API Error [${res.status}]: ${errorText}`);
  }
  return res.json();
}

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse<{ status: string; service: string; database: string; model_loaded: boolean }>(res);
  },

  async getDashboard(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/dashboard`);
    return handleResponse<DashboardStats>(res);
  },

  async getRequests(status?: string): Promise<PatientRequest[]> {
    const url = status ? `${API_BASE}/requests?status=${status}` : `${API_BASE}/requests`;
    const res = await fetch(url);
    return handleResponse<PatientRequest[]>(res);
  },

  async createRequest(type: string, title?: string, priority?: string): Promise<PatientRequest> {
    const res = await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, title, priority })
    });
    return handleResponse<PatientRequest>(res);
  },

  async acknowledgeRequest(id: string): Promise<PatientRequest> {
    const res = await fetch(`${API_BASE}/requests/${id}/acknowledge`, {
      method: 'PATCH'
    });
    return handleResponse<PatientRequest>(res);
  },

  async resolveRequest(id: string, note?: string): Promise<PatientRequest> {
    const res = await fetch(`${API_BASE}/requests/${id}/resolve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution_note: note })
    });
    return handleResponse<PatientRequest>(res);
  },

  async cancelRequest(id: string): Promise<PatientRequest> {
    const res = await fetch(`${API_BASE}/requests/${id}/cancel`, {
      method: 'PATCH'
    });
    return handleResponse<PatientRequest>(res);
  },

  async getCaregiverAlerts(): Promise<{ alerts: PatientRequest[]; emergency_count: number; total_active: number; escalation_timeout_sec: number }> {
    const res = await fetch(`${API_BASE}/caregiver/alerts`);
    return handleResponse(res);
  },

  async getRoomState(): Promise<RoomState> {
    const res = await fetch(`${API_BASE}/room`);
    return handleResponse<RoomState>(res);
  },

  async updateLight(light_on?: boolean, brightness?: number): Promise<RoomState> {
    const res = await fetch(`${API_BASE}/room/light`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ light_on, light_brightness: brightness })
    });
    return handleResponse<RoomState>(res);
  },

  async updateFan(fan_on?: boolean, speed?: number): Promise<RoomState> {
    const res = await fetch(`${API_BASE}/room/fan`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fan_on, fan_speed: speed })
    });
    return handleResponse<RoomState>(res);
  },

  async getEvents(filters?: { event_type?: string; priority?: string; search?: string }): Promise<ActivityEvent[]> {
    const params = new URLSearchParams();
    if (filters?.event_type) params.append('event_type', filters.event_type);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.search) params.append('search', filters.search);

    const res = await fetch(`${API_BASE}/events?${params.toString()}`);
    return handleResponse<ActivityEvent[]>(res);
  },

  async clearEvents(keepReal: boolean = false): Promise<{ message: string; count: number }> {
    const res = await fetch(`${API_BASE}/events?keep_real=${keepReal}`, {
      method: 'DELETE'
    });
    return handleResponse(res);
  },

  async getSettings(): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    return handleResponse<AppSettings>(res);
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return handleResponse<AppSettings>(res);
  },

  async seedDemo(): Promise<{ message: string; is_demo: boolean }> {
    const res = await fetch(`${API_BASE}/settings/seed-demo`, {
      method: 'POST'
    });
    return handleResponse(res);
  },

  async resetDemo(): Promise<{ message: string; is_demo: boolean }> {
    const res = await fetch(`${API_BASE}/settings/reset-demo`, {
      method: 'POST'
    });
    return handleResponse(res);
  },

  async processFrame(imageBase64: string): Promise<BlinkTelemetry & { menu_state: MenuState; action_result?: any }> {
    const res = await fetch(`${API_BASE}/vision/process-frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: imageBase64 })
    });
    return handleResponse(res);
  },

  async simulateGesture(gesture: string): Promise<{ gesture: string; menu_state: MenuState; action_result?: any }> {
    const res = await fetch(`${API_BASE}/vision/simulate-gesture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gesture })
    });
    return handleResponse(res);
  },

  async getMenu(): Promise<MenuState> {
    const res = await fetch(`${API_BASE}/vision/menu`);
    return handleResponse<MenuState>(res);
  }
};
