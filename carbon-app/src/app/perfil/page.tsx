"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { api, OnboardResponse } from "@/lib/api";

export default function PerfilPage() {
  const router = useRouter();
  const [bydEmail, setBydEmail] = useState("");
  const [bydPassword, setBydPassword] = useState("");
  const [bydPin, setBydPin] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [vehicleData, setVehicleData] = useState<OnboardResponse | null>(null);

  const handleConnect = async () => {
    if (!bydEmail || !bydPassword) return;
    setLoading(true);
    setError("");
    try {
      const result = await api.onboard(bydEmail, bydPassword, bydPin || undefined);
      setVehicleData(result);
      setConnected(true);
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Erro ao conectar. Verifique suas credenciais BYD."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Perfil</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Sua conta e veículo</p>
      </div>

      {/* BYD Connection */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🚗</span>
          <div>
            <h3 className="font-semibold">Conexão BYD</h3>
            <p className="text-xs text-[var(--muted)]">
              {connected ? "Conectado" : "Conecte sua conta BYD para sincronizar dados reais"}
            </p>
          </div>
          {connected && (
            <span className="ml-auto w-2 h-2 rounded-full bg-[--positive]" />
          )}
        </div>

        {!connected ? (
          <>
            <input
              type="email"
              value={bydEmail}
              onChange={(e) => setBydEmail(e.target.value)}
              placeholder="E-mail da conta BYD"
              disabled={loading}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm mb-2 placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
            />
            <input
              type="password"
              value={bydPassword}
              onChange={(e) => setBydPassword(e.target.value)}
              placeholder="Senha da conta BYD"
              disabled={loading}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm mb-2 placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
            />
            <input
              type="password"
              value={bydPin}
              onChange={(e) => setBydPin(e.target.value)}
              placeholder="PIN de controle BYD (opcional, para comandos remotos)"
              disabled={loading}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm mb-3 placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
            />
            <button
              onClick={handleConnect}
              disabled={loading}
              className="w-full bg-[var(--accent)] text-[#0A0F0A] font-semibold py-3 rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {loading ? "Conectando..." : "Conectar BYD"}
            </button>

            {error && (
              <p className="text-sm mt-3 text-center text-[var(--negative)]">
                {error}
              </p>
            )}
          </>
        ) : (
          <div className="bg-[var(--background)] rounded-lg p-4">
            <p className="text-sm text-[var(--positive)] text-center mb-3 font-medium">
              ✅ Veículo conectado com sucesso!
            </p>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-[var(--muted)]">Veículos</span>
              <span className="text-sm font-medium">{vehicleData?.vehicles?.length || 0}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-[var(--muted)]">Viagens sincronizadas</span>
              <span className="text-sm font-medium">{vehicleData?.trips_synced || 0}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-[var(--muted)]">CO₂ evitado</span>
              <span className="text-sm font-medium">{vehicleData?.co2_kg?.toFixed(1)} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[var(--muted)]">Créditos gerados</span>
              <span className="text-sm font-medium text-[var(--accent)]">
                R$ {vehicleData?.credits_brl?.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] text-center mt-3">
              Redirecionando para o painel...
            </p>
          </div>
        )}
      </div>

      {/* Privacy info */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 mb-6">
        <h4 className="text-sm font-medium mb-2">🔒 Sua privacidade</h4>
        <ul className="text-xs text-[var(--muted)] space-y-1">
          <li>• Conexão direta com a BYD Cloud via pyBYD</li>
          <li>• Dados de localização NÃO são compartilhados com terceiros</li>
          <li>• Apenas km e kWh são usados para o cálculo de carbono</li>
          <li>• Comandos remotos exigem PIN de controle</li>
        </ul>
      </div>

      {/* App info */}
      <p className="text-center text-xs text-[var(--muted)]">
        Gold Carbon v0.2.0 · BYD API real · Feito no Brasil 🇧🇷
      </p>
    </AppShell>
  );
}
