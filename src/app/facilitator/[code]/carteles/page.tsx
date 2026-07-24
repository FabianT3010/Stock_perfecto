"use client";

import { use, useEffect, useState } from "react";
import { Spinner } from "@/components/ui";
import { readFacilitatorCreds } from "@/lib/facilitator";

export default function CartelesPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return <Carteles code={code.toUpperCase()} />;
}

type TeamLite = { id: string; name: string; joinCode: string };

function Carteles({ code }: { code: string }) {
  const [state, setState] = useState<{ loading: boolean; error: string | null; name: string; teams: TeamLite[] }>({
    loading: true,
    error: null,
    name: "",
    teams: [],
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const creds = readFacilitatorCreds(code);
      if (!creds) {
        setState((s) => ({ ...s, loading: false, error: "Abre primero el panel e ingresa el PIN." }));
        return;
      }
      const response = await fetch("/api/v2/facilitator/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });
      const json = await response.json();
      if (cancelled) return;
      if (!response.ok) {
        setState((s) => ({ ...s, loading: false, error: json.error ?? "No se pudieron cargar los códigos." }));
        return;
      }
      const codeByTeam = new Map<string, string>(
        (json.teamCredentials ?? []).map((s: { team_id: string; join_code: string }) => [s.team_id, s.join_code]),
      );
      const teams: TeamLite[] = (json.teams ?? []).map((team: { id: string; name: string }) => ({
        id: team.id,
        name: team.name,
        joinCode: codeByTeam.get(team.id) ?? "ERROR",
      }));
      setState({ loading: false, error: null, name: json.session.name, teams });
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
  const joinUrl = `${origin}/join?code=${code}`;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8 print:px-0 print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Códigos de recuperación · {state.name}</h1>
          <p className="text-sm text-slate-500">
            Respaldo privado para equipos ya registrados. {state.teams.length} equipos.
          </p>
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
          Aún no se registró ningún equipo. Comparte el código de sala y actualiza esta página después.
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
                <div className="mt-3 grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs uppercase text-slate-400">Sala</div>
                    <div className="font-mono text-3xl font-black tracking-widest text-brand-700">{code}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-slate-400">Código privado de recuperación</div>
                    <div className="font-mono text-3xl font-black tracking-widest text-accent-700">{t.joinCode}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs font-semibold text-slate-500">
                  Entrégalo únicamente a este equipo si necesita cambiar de dispositivo.
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
