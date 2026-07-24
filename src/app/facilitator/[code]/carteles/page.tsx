"use client";

import { use, useEffect, useState } from "react";
import { Spinner } from "@/components/ui";
import { getBrowserClient } from "@/lib/supabase/browser";

export default function CartelesPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return <Carteles code={code.toUpperCase()} />;
}

type TeamLite = { id: string; name: string };

function Carteles({ code }: { code: string }) {
  const [state, setState] = useState<{ loading: boolean; error: string | null; name: string; teams: TeamLite[] }>({
    loading: true,
    error: null,
    name: "",
    teams: [],
  });

  useEffect(() => {
    let cancelled = false;
    const supabase = getBrowserClient();
    (async () => {
      const { data: session } = await supabase
        .from("sessions")
        .select("id, name")
        .eq("code", code)
        .maybeSingle();
      if (cancelled) return;
      if (!session) {
        setState((s) => ({ ...s, loading: false, error: "Sala no encontrada." }));
        return;
      }
      const { data: teams } = await supabase
        .from("teams")
        .select("id, name")
        .eq("session_id", session.id)
        .order("created_at");
      if (cancelled) return;
      setState({ loading: false, error: null, name: session.name as string, teams: (teams ?? []) as TeamLite[] });
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (state.loading) {
    return <main className="flex min-h-screen items-center justify-center"><Spinner className="h-6 w-6 text-slate-400" /></main>;
  }
  if (state.error) {
    return <main className="flex min-h-screen items-center justify-center text-slate-500">{state.error}</main>;
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = `${origin}/join`;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8 print:px-0 print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Carteles de mesa · {state.name}</h1>
          <p className="text-sm text-slate-500">Imprime, recorta y pon uno en cada mesa. {state.teams.length} equipos.</p>
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
        >
          Imprimir
        </button>
      </div>

      {state.teams.length === 0 ? (
        <p className="text-sm text-slate-500 print:hidden">
          Esta sala no tiene equipos pre-creados. Puedes crearlos en el panel o dejar que entren con el código.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {state.teams.map((t) => (
            <div
              key={t.id}
              className="flex break-inside-avoid flex-col justify-between rounded-lg border-2 border-dashed border-slate-300 p-6 print:h-[48vh] print:border-slate-400"
            >
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">La Tiendita de Doña Peta</div>
                <div className="mt-2 text-3xl font-black leading-tight text-slate-900">{t.name}</div>
              </div>
              <div className="mt-6">
                <div className="text-sm text-slate-500">Entra en</div>
                <div className="font-mono text-lg font-semibold text-slate-800">{joinUrl}</div>
                <div className="mt-3 flex items-end gap-6">
                  <div>
                    <div className="text-xs uppercase text-slate-400">Código de sala</div>
                    <div className="font-mono text-4xl font-black tracking-widest text-brand-700">{code}</div>
                  </div>
                  <div className="pb-1 text-sm text-slate-500">
                    y el nombre<br />de tu equipo:<br /><span className="font-semibold text-slate-700">{t.name}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
