"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { api, ApiError, Trip, Vehicle } from "@/lib/api";
import { formatDate, formatKm } from "@/lib/carbon";

export default function ViagensPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.vehicles
      .list()
      .then(async (vehicles) => {
        if (vehicles.length > 0) {
          setVehicle(vehicles[0]);
          const t = await api.vehicles.trips(vehicles[0].id, 50);
          setTrips(t);
        }
      })
      .catch((e) => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          setAuthError(true);
        } else {
          setError(e instanceof Error ? e.message : "Erro ao carregar viagens");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const totalKm = trips.reduce((sum, t) => sum + t.distance_km, 0);
  const totalCO2 = trips.reduce((sum, t) => sum + t.co2_saved_kg, 0);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Viagens</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {vehicle ? `${vehicle.model || "BYD"} • ${vehicle.plate || vehicle.vin?.slice(-6) || ""}` : "Histórico dos seus trajetos"}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 animate-pulse h-20"
            />
          ))}
        </div>
      ) : authError ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold mb-2">Sessão expirada</h3>
          <p className="text-sm text-[var(--muted)] mb-4">
            Faça login novamente para ver suas viagens.
          </p>
          <Link
            href="/login"
            className="inline-block bg-[var(--accent)] text-[#0A0F0A] font-semibold px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            Fazer login
          </Link>
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-[var(--negative)] text-sm">{error}</p>
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">
            <svg className="w-12 h-12 mx-auto text-[var(--muted)]" viewBox="0 0 24 24" fill="none">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6M9 19h6M9 19H7M15 19h2M15 19v-8a1 1 0 011-1h4a1 1 0 011 1v8M3 10l2-6h14l2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-[var(--muted)]">Nenhuma viagem encontrada</p>
          <p className="text-sm text-[var(--muted)] mt-1">Conecte seu BYD para sincronizar</p>
          <Link
            href="/perfil"
            className="inline-block mt-4 text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Conectar veículo →
          </Link>
        </div>
      ) : (
        <>
          {/* Summary bar */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
              <p className="text-lg font-bold">{trips.length}</p>
              <p className="text-[10px] text-[var(--muted)]">viagens</p>
            </div>
            <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
              <p className="text-lg font-bold">{formatKm(totalKm)}</p>
              <p className="text-[10px] text-[var(--muted)]">total</p>
            </div>
            <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
              <p className="text-lg font-bold text-[var(--accent)]">{totalCO2.toFixed(1)} kg</p>
              <p className="text-[10px] text-[var(--muted)]">CO₂ evitado</p>
            </div>
          </div>

          {/* Trip list */}
          <div className="space-y-3">
            {trips.map((trip) => (
              <div
                key={trip.id}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{formatKm(trip.distance_km)}</p>
                    {trip.source === "byd_cloud" && (
                      <span className="text-[9px] bg-[var(--accent-soft)] text-[var(--accent)] px-1.5 py-0.5 rounded-full">
                        BYD
                      </span>
                    )}
                    {trip.source === "demo" && (
                      <span className="text-[9px] bg-[var(--accent-soft)] text-[var(--muted)] px-1.5 py-0.5 rounded-full">
                        DEMO
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--muted)]">{formatDate(trip.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--positive)]">
                    {trip.co2_saved_kg.toFixed(1)} kg CO₂
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {trip.kwh_used.toFixed(1)} kWh
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {trips.length > 0 && (
        <p className="text-center text-xs text-[var(--muted)] mt-6">
          Dados sincronizados da BYD Cloud • Atualize no painel principal
        </p>
      )}
    </AppShell>
  );
}
