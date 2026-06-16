import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      {/* Logo / Nome */}
      <div className="mb-8">
        <h1 className="text-5xl font-bold tracking-tight">
          <span className="text-[--accent]">Carbon</span>
        </h1>
        <p className="mt-3 text-[--muted] text-lg max-w-md">
          Seu BYD vale dinheiro. Descubra quanto.
        </p>
      </div>

      {/* Hero illustration placeholder */}
      <div className="w-48 h-48 rounded-full bg-[--surface] border border-[--border] flex items-center justify-center mb-10">
        <div className="text-6xl">⚡</div>
      </div>

      {/* CTA */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 bg-[--accent] text-[#0A0F0A] font-semibold px-8 py-4 rounded-xl text-lg hover:opacity-90 transition-opacity"
      >
        Começar agora
        <span>→</span>
      </Link>

      <p className="mt-4 text-sm text-[--muted]">
        Conecte sua conta BYD em 30 segundos
      </p>

      {/* Features */}
      <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl">
        {[
          { icon: "🔌", title: "Zero instalação", desc: "Só login com sua conta BYD. Nada no carro." },
          { icon: "🪙", title: "Créditos reais", desc: "CO₂ evitado vira dinheiro de verdade." },
          { icon: "💸", title: "Pix na conta", desc: "Resgate quando quiser, a partir de R$ 50." },
        ].map((f) => (
          <div
            key={f.title}
            className="bg-[--surface] border border-[--border] rounded-xl p-6 text-left"
          >
            <div className="text-2xl mb-3">{f.icon}</div>
            <h3 className="font-semibold mb-1">{f.title}</h3>
            <p className="text-sm text-[--muted]">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-20 text-xs text-[--muted] pb-8">
        Feito no Brasil 🇧🇷 · Carbon 2026
      </footer>
    </main>
  );
}
