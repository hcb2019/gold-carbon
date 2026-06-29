const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://long-dame-leone-marie.trycloudflare.com";

async function getToken(): Promise<string | null> {
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Erro de conexão" }));
    throw new ApiError(error.detail || "Erro ao conectar com o servidor", res.status);
  }
  return res.json();
}

// ── Types ──

export interface Vehicle {
  id: string;
  vin: string;
  model: string | null;
  year: number | null;
  plate: string;
  battery_kwh: number | null;
}

export interface Trip {
  id: string;
  date: string;
  distance_km: number;
  kwh_used: number;
  co2_saved_kg: number;
  source: "byd_cloud" | "demo";
}

export interface VehicleStatus {
  vin: string;
  model: string | null;
  year: number | null;
  soc_pct: number;
  range_km: number;
  odometer_km: number;
  is_charging: boolean;
  is_locked: boolean;
  latitude: number | null;
  longitude: number | null;
  last_trip_date: string | null;
  last_trip_km: number;
  last_sync: string | null;
  cached: boolean;
}

export interface CreditSummary {
  total_brl: number;
  total_co2_kg: number;
  this_month_brl: number;
  projected_monthly_brl: number;
  commission_brl: number;
}

export interface CommandResult {
  success: boolean;
  command: string;
  message: string;
  vin: string;
  timestamp: string;
}

export interface OnboardResponse {
  message: string;
  vehicles: string[];
  trips_synced: number;
  co2_kg: number;
  credits_brl: number;
}

export interface SyncResponse {
  message: string;
  synced: number;
}

// ── API ──

export const api = {
  onboard: (email: string, password: string, pin?: string) =>
    fetchAPI<OnboardResponse>("/api/onboard", {
      method: "POST",
      body: JSON.stringify({
        byd_email: email,
        byd_password: password,
        byd_control_pin: pin || "",
      }),
    }),

  vehicles: {
    list: () => fetchAPI<Vehicle[]>("/api/vehicles"),

    status: (id: string) => fetchAPI<VehicleStatus>(`/api/vehicles/${id}/status`),

    trips: (id: string, limit = 30) =>
      fetchAPI<Trip[]>(`/api/vehicles/${id}/trips?limit=${limit}`),

    sync: (id: string) =>
      fetchAPI<SyncResponse>(`/api/vehicles/${id}/sync`, { method: "POST" }),

    command: (id: string, command: string, temperature?: number, duration_minutes?: number) =>
      fetchAPI<CommandResult>(`/api/vehicles/${id}/commands`, {
        method: "POST",
        body: JSON.stringify({ command, temperature, duration_minutes }),
      }),

    demoStatus: (id: string) =>
      fetchAPI<VehicleStatus>(`/api/demo/status/${id}`),
  },

  demo: {
    onboard: (vehicles = 1) =>
      fetchAPI<OnboardResponse>("/api/demo/onboard", {
        method: "POST",
        body: JSON.stringify({ vehicles }),
      }),
    reset: () =>
      fetchAPI<{ message: string }>("/api/demo/reset", { method: "POST" }),
  },

  credits: {
    summary: () => fetchAPI<CreditSummary>("/api/credits/summary"),
  },

  payouts: {
    history: () =>
      fetchAPI<Array<{ id: string; amount_brl: number; status: string; created_at: string }>>(
        "/api/payouts/history"
      ),
    request: (pix_key: string) =>
      fetchAPI<{ message: string; payout_id: string }>("/api/payouts/request", {
        method: "POST",
        body: JSON.stringify({ pix_key }),
      }),
  },

  ranking: {
    get: (limit = 50) =>
      fetchAPI<Array<{ position: number; co2_saved_kg: number; credits_brl: number }>>(
        `/api/ranking?limit=${limit}`
      ),
  },

  health: () => fetchAPI<{ status: string; app: string }>("/health"),
};
