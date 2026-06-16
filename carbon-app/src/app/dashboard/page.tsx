"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { api, CreditSummary } from "@/lib/api";
import { formatBRL, formatCO2 } from "@/lib/carbon";

export default function DashboardPage() {
  const [summary, setSummary] = useState<CreditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.credits
      .summary()
      .then(setSummary)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      {/* Hero number */}
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-widest text-[--muted] mb-2">
          Seus créditos acumulados
        </p>
        {loading ? (
          <div className="text-4xl font-bold text-[--muted] animate-pulse">
            R$ --,--
          </div>
        ) : error ? (
          <div className="text-[--negative] text-sm">{error}</div>
        ) : (
          <div className="text-5xl font-bold text-[--accent]">
            {formatBRL(summary?.total_brl || 0)}
          </div>
        )}
        <p className="mt-2 text-sm text-[--muted]">
          {summary ? `${formatCO2(summary.total_co2_kg)} de CO₂ evitado` : "Conecte seu BYD para começar"}
        </p>
      </div>

      {/* CO₂ Gauge */}
      <div className="bg-[--surface] border border-[--border] rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">CO₂ Evitado</h3>
          <span className="text-xs text-[--muted]">Este mês</span>
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
              strokeDashoffset={summary ? 283 - (summary.total_co2_kg / 500) * 283 : 283}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">
              {summary ? formatCO2(summary.total_co2_kg) : "--"}
            </span>
            <span className="text-[10px] text-[--muted]">de 500 kg</span>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[--surface] border border-[--border] rounded-xl p-4">
          <p className="text-xs text-[--muted] mb-1">Comissão Gold Carbon</p>
          <p className="text-xl font-bold text-[--muted]">
            {summary ? formatBRL(summary.commission_brl) : "--"}
          </p>
          <p className="text-[10px] text-[--muted] mt-1">15% dos créditos</p>
        </div>
        <div className="bg-[--surface] border border-[--border] rounded-xl p-4">
          <p className="text-xs text-[--muted] mb-1">Projeção mensal</p>
          <p className="text-xl font-bold text-[--positive]">
            {summary ? formatBRL(summary.projected_monthly_brl) : "--"}
          </p>
          <p className="text-[10px] text-[--muted] mt-1">Baseado no seu uso</p>
        </div>
      </div>

      {/* Ranking teaser */}
      <div className="bg-[--surface] border border-[--border] rounded-2xl p-6">
        <h3 className="font-semibold mb-2">🏆 Ranking Brasil</h3>
        <p className="text-sm text-[--muted] mb-3">
          Veja como você se compara com outros motoristas BYD.
        </p>
        <div className="bg-[--background] rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-[--accent]">--</p>
          <p className="text-xs text-[--muted] mt-1">Conecte seu veículo para entrar no ranking</p>
        </div>
      </div>
    </AppShell>
  );
}
