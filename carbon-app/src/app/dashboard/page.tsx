"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { api, CreditSummary, Vehicle, VehicleStatus } from "@/lib/api";
import { formatBRL, formatCO2, formatKM, formatSOC } from "@/lib/carbon";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const [summary, setSummary] = useState<CreditSummary | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [status, setStatus] = useState<VehicleStatus | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        // Get user info from Supabase
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const meta = userData.user.user_metadata;
          setUserName(meta?.full_name || meta?.name || userData.user.email?.split("@")[0] || null);
        }

        // Get vehicles
        const v = await api.vehicles.list();
        setVehicles(v);

        if (v.length > 0) {
          // Real-time status for first vehicle
          try {
            const s = await api.vehicles.status(v[0].id);
            setStatus(s);
          } catch {
            // Status fetch can fail if BYD Cloud is slow
          }

          // Credit summary
          const cs = await api.credits.summary();
          setSummary(cs);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSync = async () => {
    if (!vehicles[0]) return;
    setSyncing(true);
    try {
      await api.vehicles.sync(vehicles[0].id);
      const s = await api.vehicles.status(vehicles[0].id);
      setStatus(s);
      const cs = await api.credits.summary();
      setSummary(cs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao sincronizar");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AppShell>
      {/* Greeting */}
      {userName && (
        <p className="text-sm text-[var(--muted)] mb-2">
          Olá, <span className="font-medium text-[--foreground]">{userName}</span> 👋
        </p>
      )}

      {loading ? (
        <div className="text-center py-16">
          <div className="text-4xl font-bold text-[var(--muted)] animate-pulse">
            R$ --,--
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-[var(--negative)] text-sm">{error}</p>
        </div>
      ) : vehicles.length === 0 ? (
        /* CTA to connect BYD when no vehicles */
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🚗</div>
          <h2 className="text-xl font-bold mb-2">Conecte seu BYD</h2>
          <p className="text-sm text-[var(--muted)] mb-6 max-w-xs mx-auto">
            Para começar a ganhar créditos de carbono, conecte sua conta BYD e sincronize seus trajetos.
          </p>
          <Link
            href="/perfil"
            className="inline-block bg-[var(--accent)] text-[#0A0F0A] font-semibold px-8 py-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            Conectar agora
          </Link>
        </div>
      ) : (
        <>
          {/* Hero number */}
          <div className="text-center mb-6">
            <p className="text-xs uppercase tracking-widest text-[var(--muted)] mb-2">
              Seus créditos acumulados
            </p>
            <div className="text-5xl font-bold text-[var(--accent)]">
              {formatBRL(summary?.total_brl || 0)}
            </div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {summary ? `${formatCO2(summary.total_co2_kg)} de CO₂ evitado` : "Carregando..."}
            </p>
          </div>

          {/* Vehicle Status Card — REAL DATA */}
          {status && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">
                    {vehicles[0]?.model || "BYD"}
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    {vehicles[0]?.plate || vehicles[0]?.vin?.slice(-6) || ""}
                    {status.cached && (
                      <span className="ml-2 text-[var(--warning)]">• Dados em cache</span>
                    )}
                    {!status.cached && (
                      <span className="ml-2 text-[var(--positive)]">• Ao vivo</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="text-xs bg-[var(--accent-soft)] text-[var(--accent)] px-3 py-1.5 rounded-full hover:bg-[var(--accent-glow)] transition-colors disabled:opacity-50"
                >
                  {syncing ? "Sincronizando..." : "Atualizar"}
                </button>
              </div>

              {/* Battery gauge */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
                    <span>Bateria</span>
                    <span>{formatSOC(status.soc_pct)}</span>
                  </div>
                  <div className="w-full h-3 bg-[var(--background)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(100, status.soc_pct)}%`,
                        backgroundColor:
                          status.soc_pct > 50
                            ? "var(--accent)"
                            : status.soc_pct > 20
                            ? "var(--warning, #f59e0b)"
                            : "var(--negative, #ef4444)",
                      }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatKM(status.range_km)}</p>
                  <p className="text-[10px] text-[var(--muted)]">autonomia</p>
                </div>
              </div>

              {/* Quick stats grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[var(--background)] rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{formatKM(status.odometer_km)}</p>
                  <p className="text-[10px] text-[var(--muted)]">Odômetro</p>
                </div>
                <div className="bg-[var(--background)] rounded-lg p-3 text-center">
                  <p className={`text-lg font-bold ${status.is_charging ? "text-[var(--accent)]" : ""}`}>
                    {status.is_charging ? "⚡ Sim" : "—"}
                  </p>
                  <p className="text-[10px] text-[var(--muted)]">Carregando</p>
                </div>
                <div className="bg-[var(--background)] rounded-lg p-3 text-center">
                  <p className={`text-lg font-bold ${status.is_locked ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                    {status.is_locked ? "🔒 Sim" : "🔓 Não"}
                  </p>
                  <p className="text-[10px] text-[var(--muted)]">Trancado</p>
                </div>
              </div>
            </div>
          )}

          {/* CO₂ Gauge */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">CO₂ Evitado</h3>
              <span className="text-xs text-[var(--muted)]">Este mês</span>
            </div>
            <div className="relative w-40 h-40 mx-auto">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle
                  cx="50" cy="50" r="45"
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="8"
                />
                <circle
                  cx="50" cy="50" r="45"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="283"
                  strokeDashoffset={
                    summary
                      ? Math.max(0, 283 - (summary.total_co2_kg / 500) * 283)
                      : 283
                  }
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">
                  {summary ? formatCO2(summary.total_co2_kg) : "--"}
                </span>
                <span className="text-[10px] text-[var(--muted)]">de 500 kg</span>
              </div>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
              <p className="text-xs text-[var(--muted)] mb-1">Comissão Gold Carbon</p>
              <p className="text-xl font-bold text-[var(--muted)]">
                {summary ? formatBRL(summary.commission_brl) : "--"}
              </p>
              <p className="text-[10px] text-[var(--muted)] mt-1">15% dos créditos</p>
            </div>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
              <p className="text-xs text-[var(--muted)] mb-1">Projeção mensal</p>
              <p className="text-xl font-bold text-[var(--positive)]">
                {summary ? formatBRL(summary.projected_monthly_brl) : "--"}
              </p>
              <p className="text-[10px] text-[var(--muted)] mt-1">Baseado no seu uso</p>
            </div>
          </div>

          {/* Remote Commands */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 mb-4">
            <h3 className="font-semibold mb-3">Comandos Rápidos</h3>
            <div className="grid grid-cols-3 gap-3">
              <CommandButton
                icon="🔒"
                label="Travar"
                command="lock"
                vehicleId={vehicles[0]?.id}
              />
              <CommandButton
                icon="🔓"
                label="Destravar"
                command="unlock"
                vehicleId={vehicles[0]?.id}
              />
              <CommandButton
                icon="❄️"
                label="Clima"
                command="start_climate"
                vehicleId={vehicles[0]?.id}
              />
            </div>
          </div>

          {/* Ranking teaser */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <h3 className="font-semibold mb-2">
              <svg className="inline w-4 h-4 mr-1.5 -mt-0.5" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
              Ranking Brasil
            </h3>
            <p className="text-sm text-[var(--muted)] mb-3">
              Veja como você se compara com outros motoristas BYD.
            </p>
            <Link href="/ranking" className="block bg-[var(--background)] rounded-lg p-4 text-center hover:bg-[var(--accent-soft)] transition-colors">
              <p className="text-2xl font-bold text-[var(--accent)]">Ver ranking</p>
              <p className="text-xs text-[var(--muted)] mt-1">Compare sua economia de CO₂</p>
            </Link>
          </div>
        </>
      )}
    </AppShell>
  );
}

// ── Command Button Component ──

function CommandButton({
  icon,
  label,
  command,
  vehicleId,
}: {
  icon: string;
  label: string;
  command: string;
  vehicleId?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handle = async () => {
    if (!vehicleId) return;
    setLoading(true);
    setMsg("");
    try {
      const result = await api.vehicles.command(vehicleId, command);
      setMsg(result.success ? "✓" : "✗");
    } catch {
      setMsg("Erro");
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(""), 2000);
    }
  };

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 text-center hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all disabled:opacity-50"
    >
      <div className="text-2xl mb-1">{loading ? "⏳" : msg || icon}</div>
      <p className="text-xs font-medium">{label}</p>
    </button>
  );
}
