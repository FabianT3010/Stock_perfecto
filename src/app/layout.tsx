import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stock Perfecto",
  description:
    "Simulación por rondas de decisiones de inventario bajo incertidumbre.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <header className="sticky top-0 z-40 border-b border-brand-900/40 bg-brand-700">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
            <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-white/10 text-xs font-bold tracking-tight text-white ring-1 ring-white/20">
              SP
            </span>
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
              Stock&nbsp;Perfecto
            </span>
            <span className="ml-auto hidden text-[11px] font-medium uppercase tracking-wider text-white/55 sm:block">
              Simulación de gestión de inventario
            </span>
          </div>
          <div className="h-0.5 w-full bg-accent-500" />
        </header>
        {children}
      </body>
    </html>
  );
}
