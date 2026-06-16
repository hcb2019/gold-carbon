"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { api, Trip } from "@/lib/api";
import { formatDate, formatKm } from "@/lib/carbon";

export default function ViagensPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.vehicles
      .list()
      .then(async (vehicles) => {
        if (vehicles.length > 0) {
          const t = await api.vehicles.trips(vehicles[0].id, 50);
          setTrips(t);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Viagens</h1>
        <p className="text-sm text-[--muted] mt-1">Histórico dos seus trajetos</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-[--surface] border border-[--border] rounded-xl p-4 animate-pulse h-20"
            />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🛣️</div>
          <p className="text-[--muted]">Nenhuma viagem encontrada</p>
          <p className="text-sm text-[--muted] mt-1">Conecte seu BYD para sincronizar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="bg-[--surface] border border-[--border] rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium">{formatKm(trip.distance_km)}</p>
                <p className="text-xs text-[--muted]">{formatDate(trip.date)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[--positive]">
                  {trip.co2_saved_kg.toFixed(1)} kg CO₂
                </p>
                <p className="text-xs text-[--muted]">
                  {trip.kwh_used.toFixed(1)} kWh
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {trips.length > 0 && (
        <p className="text-center text-xs text-[--muted] mt-6">
          Sincronizado automaticamente todo dia
        </p>
      )}
    </AppShell>
  );
}
