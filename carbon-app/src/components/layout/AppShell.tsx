"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Início", icon: "🏠" },
  { href: "/viagens", label: "Viagens", icon: "🛣️" },
  { href: "/creditos", label: "Créditos", icon: "🪙" },
  { href: "/perfil", label: "Perfil", icon: "👤" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[--background]/80 backdrop-blur border-b border-[--border]">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
          <Link href="/dashboard" className="font-bold text-[--accent] text-lg">
            Carbon
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[--positive] animate-pulse" />
            <span className="text-xs text-[--muted]">Online</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 pb-24">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-[--surface] border-t border-[--border]">
        <div className="max-w-lg mx-auto flex items-center justify-around h-16">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                  active
                    ? "text-[--accent]"
                    : "text-[--muted] hover:text-[--foreground]"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
