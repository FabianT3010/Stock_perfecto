import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-4 py-12">
      <div className="mb-10 text-center">
        <span className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
          Simulación por rondas
        </span>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
          Stock Perfecto
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Administra tu kiosco y decide{" "}
          <span className="font-semibold text-slate-800">
            cuántas unidades preparar
          </span>{" "}
          antes de conocer la demanda real. Equilibra ganancia, sobrantes y
          ventas perdidas… ronda a ronda.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Link
          href="/join"
          className="group rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
        >
          <div className="text-3xl">🧑‍🎓</div>
          <h2 className="mt-3 text-xl font-bold text-slate-900">Soy participante</h2>
          <p className="mt-1 text-sm text-slate-500">
            Entra con el código de tu sala y compite por la mejor ganancia
            acumulada.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 group-hover:gap-2">
            Unirme a una sala →
          </span>
        </Link>

        <Link
          href="/facilitator"
          className="group rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
        >
          <div className="text-3xl">🎛️</div>
          <h2 className="mt-3 text-xl font-bold text-slate-900">Soy facilitador</h2>
          <p className="mt-1 text-sm text-slate-500">
            Crea una sala, controla las rondas, revela la demanda y proyecta el
            ranking.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 group-hover:gap-2">
            Crear una sala →
          </span>
        </Link>
      </div>

      <p className="mt-10 text-center text-xs text-slate-400">
        Una buena decisión no consiste en adivinar la demanda, sino en usar datos
        para equilibrar ganancia, riesgo, inventario y ventas perdidas.
      </p>
    </main>
  );
}
