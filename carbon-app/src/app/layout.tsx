import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Gold Carbon — Seu BYD vale dinheiro",
    template: "%s | Gold Carbon",
  },
  description:
    "Transforme os quilômetros rodados no seu BYD elétrico em créditos de carbono. Ganhe dinheiro real enquanto dirige. Conecte sua conta BYD e comece agora.",
  keywords: [
    "BYD", "crédito de carbono", "carro elétrico", "CO2", "sustentabilidade",
    "Dolphin", "Seal", "Yuan Plus", "Brasil",
  ],
  authors: [{ name: "Carbon" }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Carbon",
    title: "Gold Carbon — Seu BYD vale dinheiro",
    description:
      "Transforme km rodados no seu BYD em dinheiro real com créditos de carbono.",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/images/icon-192.png",
    apple: "/images/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#00D68F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[--background] text-[--foreground]">
        {children}
      </body>
    </html>
  );
}
