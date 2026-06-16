"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { api, CreditSummary } from "@/lib/api";
import { formatBRL, formatCO2 } from "@/lib/carbon";

export default function CreditosPage() {
  const [summary, setSummary] = useState<CreditSummary | null>(null);
  const [pixKey, setPixKey] = useState("");
  const [payoutMsg, setPayoutMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.credits.summary().then(setSummary).catch(() => {});
  }, []);

  const handlePayout = async () => {
    if (!pixKey.trim()) return;
    setLoading(true);
    setPayoutMsg("");
    try {
      const result = await api.payouts.request(pixKey);
      setPayoutMsg(result.message);
    } catch (e: unknown) {
      setPayoutMsg(e instanceof Error ? e.message : "Erro ao solicitar resgate");
    } finally {
      setLoading(false);
    }
  };

  const total = summary?.total_brl || 0;
  const canPayout = total >= 50;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Créditos</h1>
        <p className="text-sm text-[--muted] mt-1">Seu saldo e resgates</p>
      </div>

      {/* Balance card */}
      <div className="bg-[--surface] border border-[--accent]/20 rounded-2xl p-6 mb-6 text-center">
        <p className="text-xs uppercase tracking-widest text-[--muted] mb-2">
          Saldo disponível
        </p>
        <p className="text-5xl font-bold text-[--accent]">{formatBRL(total)}</p>
        <p className="text-sm text-[--muted] mt-2">
          {summary ? formatCO2(summary.total_co2_kg) : "--"} de CO₂ evitado
        </p>
      </div>

      {/* Payout section */}
      <div className="bg-[--surface] border border-[--border] rounded-2xl p-6 mb-6">
        <h3 className="font-semibold mb-1">Resgatar via Pix</h3>
        <p className="text-xs text-[--muted] mb-4">
          Mínimo de {formatBRL(50)}. A comissão de 15% é aplicada automaticamente.
        </p>

        <input
          type="text"
          value={pixKey}
          onChange={(e) => setPixKey(e.target.value)}
          placeholder="Sua chave Pix (CPF, e-mail ou telefone)"
          className="w-full bg-[--background] border border-[--border] rounded-lg px-4 py-3 text-sm mb-3 placeholder:text-[--muted]/50 focus:outline-none focus:border-[--accent]"
          disabled={!canPayout || loading}
        />

        <button
          onClick={handlePayout}
          disabled={!canPayout || !pixKey.trim() || loading}
          className="w-full bg-[--accent] text-[#0A0F0A] font-semibold py-3 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {loading ? "Solicitando..." : canPayout ? "Receber agora" : `Faltam ${formatBRL(50 - total)} para resgatar`}
        </button>

        {payoutMsg && (
          <p className={`text-sm mt-3 text-center ${payoutMsg.includes("sucesso") ? "text-[--positive]" : "text-[--neutral]"}`}>
            {payoutMsg}
          </p>
        )}
      </div>

      {/* Commission info */}
      <div className="bg-[--surface] border border-[--border] rounded-xl p-4">
        <h4 className="text-sm font-medium mb-1">Como funciona</h4>
        <ul className="text-xs text-[--muted] space-y-1">
          <li>• Seu BYD gera créditos automaticamente a cada viagem</li>
          <li>• A Carbon fica com 15% pela curadoria e venda dos créditos</li>
          <li>• Você recebe 85% via Pix em até 5 dias úteis</li>
          <li>• Créditos são verificados pela Carbonext</li>
        </ul>
      </div>
    </AppShell>
  );
}
