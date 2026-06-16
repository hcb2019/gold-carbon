import Link from "next/link";

const steps = [
  {
    num: "01",
    title: "Conecte sua conta BYD",
    desc: "Login com o mesmo e-mail e senha do app BYD. Seus dados de viagem são sincronizados automaticamente.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Acompanhe em tempo real",
    desc: "Cada viagem gera créditos automaticamente. Veja seu saldo crescer no dashboard com gráficos e projeções.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Resgate via Pix",
    desc: "A partir de R$ 50 acumulados, solicite o resgate. O valor cai na sua conta em até 5 dias úteis.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
        <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M12 10v4M10 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
];

const metrics = [
  { value: "2.3 kg", label: "CO₂ evitado por litro de gasolina não queimado" },
  { value: "R$ 45/ton", label: "Preço do crédito de carbono no mercado voluntário brasileiro" },
  { value: "15%", label: "Nossa comissão. Você fica com 85%. Sem mensalidade." },
];

export default function HomePage() {
  return (
    <>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg)]/85 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center py-4">
          <span className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--accent)] tracking-[-0.01em]">
            Gold Carbon
          </span>
          <Link
            href="/login"
            className="bg-[var(--accent)] text-[#040] font-semibold px-5 py-2 rounded-full text-sm hover:shadow-[0_0_24px_var(--accent-glow)] transition-shadow"
          >
            Acessar
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-20 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.5rem,5vw,5rem)] leading-[1.05] tracking-[-0.03em] mb-6">
              Seu{" "}
              <span className="text-[var(--accent)]">BYD</span>{" "}
              gera dinheiro enquanto você dirige
            </h1>
            <p className="text-[var(--muted)] text-lg max-w-md leading-relaxed mb-8">
              Cada quilômetro elétrico vira crédito de carbono. Conecte sua conta,
              acompanhe em tempo real e receba via Pix. Sem taxa fixa, só 15% sobre
              o que ganhar.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-[var(--accent)] text-[#041008] font-bold px-8 py-3.5 rounded-full text-base hover:shadow-[0_0_32px_var(--accent-glow)] hover:-translate-y-px transition-all"
              >
                Começar agora <span>→</span>
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center gap-2 border border-white/15 text-white font-medium px-8 py-3.5 rounded-full text-base hover:border-white/35 hover:bg-white/[0.03] transition-all"
              >
                Como funciona
              </a>
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative flex items-center justify-center">
            <div className="absolute w-72 h-72 rounded-full bg-[radial-gradient(circle,var(--accent-glow)_0%,transparent_70%)]" />
            <div className="relative z-10 w-48 h-48 rounded-full border-2 border-[var(--accent)]/25 flex items-center justify-center">
              <div className="w-36 h-36 rounded-full bg-[var(--surface-2)] border border-[var(--accent)]/30 flex flex-col items-center justify-center gap-1">
                <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--accent)] leading-none">R$0</span>
                <span className="text-xs text-[var(--muted)] tracking-wider">seu saldo</span>
              </div>
            </div>
            <div className="absolute -bottom-3 -right-3 z-20 bg-[var(--surface-2)] border border-[var(--border)] rounded-full px-4 py-2 flex items-center gap-2 text-sm text-[var(--muted)]">
              <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse-glow" />
              Sincronizado com BYD
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <span className="text-xs uppercase tracking-[0.12em] text-[var(--accent)] font-semibold mb-4 block">
            Como funciona
          </span>
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,3.5vw,3rem)] leading-[1.15] tracking-[-0.02em] mb-3">
            Três passos,
            <br />
            zero complicação
          </h2>
          <p className="text-[var(--muted)] text-lg max-w-xl mb-12">
            Nada de instalar aparelho no carro. Só sua conta BYD e pronto.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div
                key={s.num}
                className="relative bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 hover:border-[var(--accent)]/20 transition-colors group"
              >
                <span className="absolute top-4 right-6 font-[family-name:var(--font-display)] text-6xl font-bold text-[var(--accent)]/10 leading-none select-none">
                  {s.num}
                </span>
                <div className="w-11 h-11 rounded-[10px] bg-[var(--accent-soft)] flex items-center justify-center mb-5 text-[var(--accent)] relative z-[1]">
                  {s.icon}
                </div>
                <h3 className="font-semibold text-base mb-2 relative z-[1]">{s.title}</h3>
                <p className="text-[var(--muted)] text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <span className="text-xs uppercase tracking-[0.12em] text-[var(--accent)] font-semibold mb-4 block">
            Impacto real
          </span>
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,3.5vw,3rem)] leading-[1.15] tracking-[-0.02em] mb-12">
            Números que
            <br />
            falam por si
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8"
              >
                <p className="font-[family-name:var(--font-display)] text-4xl font-bold text-[var(--accent)] leading-none mb-2">
                  {m.value}
                </p>
                <p className="text-[var(--muted)] text-sm">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 text-center">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,3.5vw,2.75rem)] leading-[1.15] tracking-[-0.02em] mb-4 max-w-2xl mx-auto">
            Pronto pra transformar km em dinheiro?
          </h2>
          <p className="text-[var(--muted)] text-lg max-w-md mx-auto mb-8">
            Conecte sua conta BYD em 30 segundos e comece a acumular créditos hoje.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-[var(--accent)] text-[#041008] font-bold px-10 py-4 rounded-full text-lg hover:shadow-[0_0_32px_var(--accent-glow)] hover:-translate-y-px transition-all"
          >
            Começar agora <span>→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 text-center text-[var(--muted)] text-sm">
        Gold Carbon © 2026 · Feito no Brasil 🇧🇷 · Carbono certificado via parceira credenciada
      </footer>
    </>
  );
}
