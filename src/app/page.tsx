import type { ReactNode } from "react";
import Link from "next/link";
import { IconControls, IconUser } from "@/components/ui";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
          Actividad de laboratorio
        </span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Gestión de inventario bajo incertidumbre
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          Cada participante administra un punto de venta y decide cuántas unidades
          preparar antes de conocer la demanda real. El objetivo es equilibrar
          ganancia, inventario sobrante y ventas perdidas a lo largo de varias
          rondas de decisión.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <RoleCard
          href="/join"
          icon={<IconUser className="h-5 w-5" />}
          iconClass="bg-brand-50 text-brand-700"
          title="Participante"
          description="Ingresa con el código de tu sala y registra tus decisiones ronda por ronda."
          cta="Ingresar a una sala"
        />
        <RoleCard
          href="/facilitator"
          icon={<IconControls className="h-5 w-5" />}
          iconClass="bg-accent-50 text-accent-700"
          title="Facilitador"
          description="Crea la sala, controla las rondas, revela la demanda y proyecta los resultados."
          cta="Crear una sala"
        />
      </div>

      <p className="mt-12 max-w-3xl border-l-2 border-slate-300 pl-4 text-sm text-slate-500">
        Una buena decisión no consiste en adivinar la demanda exacta, sino en usar
        datos para equilibrar ganancia, riesgo, inventario y ventas perdidas.
      </p>
    </main>
  );
}

function RoleCard({
  href,
  icon,
  iconClass,
  title,
  description,
  cta,
}: {
  href: string;
  icon: ReactNode;
  iconClass: string;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <span
        className={`inline-flex h-11 w-11 items-center justify-center rounded-md ${iconClass}`}
      >
        {icon}
      </span>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-500">
        {description}
      </p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 transition-[gap] group-hover:gap-2">
        {cta}
        <span aria-hidden>&rarr;</span>
      </span>
    </Link>
  );
}
