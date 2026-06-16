"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";

export default function PerfilPage() {
  const [bydEmail, setBydEmail] = useState("");
  const [bydPassword, setBydPassword] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleConnect = async () => {
    if (!bydEmail || !bydPassword) return;
    setLoading(true);
    setMsg("");
    // Simula conexão — em produção, chama endpoint real
    await new Promise((r) => setTimeout(r, 1500));
    setConnected(true);
    setMsg("BYD Seal conectado com sucesso! 🎉");
    setLoading(false);
  };

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Perfil</h1>
        <p className="text-sm text-[--muted] mt-1">Sua conta e veículo</p>
      </div>

      {/* BYD Connection */}
      <div className="bg-[--surface] border border-[--border] rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🚗</span>
          <div>
            <h3 className="font-semibold">Conexão BYD</h3>
            <p className="text-xs text-[--muted]">
              {connected ? "Conectado" : "Conecte sua conta BYD"}
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
              className="w-full bg-[--background] border border-[--border] rounded-lg px-4 py-3 text-sm mb-2 placeholder:text-[--muted]/50 focus:outline-none focus:border-[--accent]"
            />
            <input
              type="password"
              value={bydPassword}
              onChange={(e) => setBydPassword(e.target.value)}
              placeholder="Senha da conta BYD"
              className="w-full bg-[--background] border border-[--border] rounded-lg px-4 py-3 text-sm mb-3 placeholder:text-[--muted]/50 focus:outline-none focus:border-[--accent]"
            />
            <button
              onClick={handleConnect}
              disabled={loading}
              className="w-full bg-[--accent] text-[#0A0F0A] font-semibold py-3 rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {loading ? "Conectando..." : "Conectar BYD"}
            </button>
          </>
        ) : (
          <div className="bg-[--background] rounded-lg p-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-[--muted]">Modelo</span>
              <span className="text-sm font-medium">BYD Seal</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-[--muted]">Ano</span>
              <span className="text-sm font-medium">2025</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[--muted]">Bateria</span>
              <span className="text-sm font-medium">82.5 kWh</span>
            </div>
          </div>
        )}

        {msg && (
          <p className={`text-sm mt-3 text-center ${msg.includes("sucesso") ? "text-[--positive]" : "text-[--neutral]"}`}>
            {msg}
          </p>
        )}
      </div>

      {/* Privacy info */}
      <div className="bg-[--surface] border border-[--border] rounded-xl p-4 mb-6">
        <h4 className="text-sm font-medium mb-2">🔒 Sua privacidade</h4>
        <ul className="text-xs text-[--muted] space-y-1">
          <li>• Suas credenciais BYD são criptografadas</li>
          <li>• Dados de localização NÃO são compartilhados</li>
          <li>• Apenas km e kWh são usados para o cálculo de carbono</li>
          <li>• Você pode desconectar a qualquer momento</li>
        </ul>
      </div>

      {/* App info */}
      <p className="text-center text-xs text-[--muted]">
        Carbon v0.1.0 · Feito no Brasil 🇧🇷
      </p>
    </AppShell>
  );
}
