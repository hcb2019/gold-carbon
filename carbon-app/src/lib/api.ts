const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
    throw new Error(error.detail || "Erro ao conectar com o servidor");
  }
  return res.json();
}

// ── Types ──

export interface Vehicle {
  id: string;
  vin: string;
  model: string | null;
  year: number | null;
  battery_kwh: number | null;
}

export interface Trip {
  id: string;
  date: string;
  distance_km: number;
  kwh_used: number;
  co2_saved_kg: number;
}

export interface CreditSummary {
  total_brl: number;
  total_co2_kg: number;
  this_month_brl: number;
  projected_monthly_brl: number;
  commission_brl: number;
}

export interface VehicleStatus {
  vin: string;
  model: string | null;
  year: number | null;
  last_trip_date: string | null;
  last_trip_km: number;
}

// ── API ──

export const api = {
  vehicles: {
    list: () => fetchAPI<Vehicle[]>("/api/vehicles"),
    trips: (id: string, limit = 30) => fetchAPI<Trip[]>(`/api/vehicles/${id}/trips?limit=${limit}`),
    status: (id: string) => fetchAPI<VehicleStatus>(`/api/vehicles/${id}/status`),
  },
  credits: {
    summary: () => fetchAPI<CreditSummary>("/api/credits/summary"),
  },
  payouts: {
    history: () => fetchAPI<Array<{ id: string; amount_brl: number; status: string; created_at: string }>>("/api/payouts/history"),
    request: (pix_key: string) =>
      fetchAPI<{ message: string; payout_id: string }>("/api/payouts/request", {
        method: "POST",
        body: JSON.stringify({ pix_key }),
      }),
  },
  ranking: {
    get: (limit = 50) => fetchAPI<Array<{ position: number; co2_saved_kg: number; credits_brl: number }>>(`/api/ranking?limit=${limit}`),
  },
  health: () => fetchAPI<{ status: string; app: string }>("/health"),
};
