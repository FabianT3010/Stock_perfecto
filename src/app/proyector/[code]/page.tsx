"use client";

import { use, useEffect, useMemo, useState } from "react";
import { Spinner, cx } from "@/components/ui";
import { useGameData } from "@/lib/v2/useGameData";
import { currentRound, rankTeams } from "@/lib/v2/derive";
import { money } from "@/lib/format";

export default function ProjectorPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return <Projector code={code.toUpperCase()} />;
}

function Projector({ code }: { code: string }) {
  const data = useGameData(code);
  const round = currentRound(data.rounds, data.session);
  const ranking = useMemo(() => rankTeams(data.teams, data.kpis), [data.teams, data.kpis]);
  const remaining = useCountdown(round?.status === "open" ? round.closes_at : null);

  if (data.loading) {
    return <main className="flex min-h-screen items-center justify-center"><Spinner className="h-8 w-8 text-slate-400" /></main>;
  }
  if (data.error || !data.session) {
    return <main className="flex min-h-screen items-center justify-center text-2xl text-slate-500">{data.error ?? "Sala no encontrada."}</main>;
  }

  const { session } = data;
  const weekLabel = session.current_round > 0 ? `Semana ${session.current_round} de ${session.total_rounds}` : "Sala en espera";
  const finished = session.status === "finished";

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-10">
      <div className="flex items-baseline justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">{session.name}</div>
          <div className="mt-1 text-4xl font-black tracking-tight text-slate-900">{weekLabel}</div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase text-slate-400">Sala</div>
          <div className="font-mono text-3xl font-black tracking-widest text-brand-700">{code}</div>
        </div>
      </div>

      {round?.event_headline && !finished && (
        <div className="mt-6 rounded-xl border border-accent-200 bg-accent-50 px-6 py-4">
          <div className="text-2xl font-bold text-accent-700">{round.event_headline}</div>
          {round.event_description && <div className="mt-1 text-lg text-slate-700">{round.event_description}</div>}
        </div>
      )}

      {round?.status === "open" && (
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-brand-200 bg-brand-50 px-6 py-4 text-center">
            <div className="text-sm font-semibold uppercase tracking-wider text-brand-700">Tiempo</div>
            <div className="mt-1 font-mono text-5xl font-black tabular-nums text-brand-800">
              {formatCountdown(remaining)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 text-center">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-500">Pedidos enviados</div>
            <div className="mt-1 text-5xl font-black text-slate-900">
              {round.submission_count}/{data.teams.length}
            </div>
          </div>
        </div>
      )}

      {finished && ranking[0] && (
        <div className="mt-6 rounded-xl border border-gold-200 bg-gold-50 px-6 py-5 text-center">
          <div className="text-sm font-semibold uppercase tracking-wider text-gold-700">Mejores Analistas del Barrio</div>
          <div className="mt-1 text-4xl font-black text-slate-900">{ranking[0].name}</div>
          <div className="tabular mt-1 text-2xl font-bold text-gold-700">{money(ranking[0].score_total)}</div>
        </div>
      )}

      {session.status === "lobby" ? (
        <div className="mt-8 grid gap-5 md:grid-cols-[1fr_2fr]">
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-6">
            <div className="text-sm font-semibold uppercase tracking-wider text-brand-700">Registro</div>
            <div className="mt-2 text-5xl font-black text-brand-800">
              {data.teams.length}/{session.max_teams}
            </div>
            <div className="mt-3 text-lg text-slate-700">
              {session.registration_open ? "Inscripciones abiertas" : "Inscripciones cerradas"}
            </div>
            <div className="mt-4 font-mono text-xl font-bold text-slate-700">
              /join?code={code}
            </div>
          </div>
          <div>
            <div className="mb-3 text-lg font-semibold uppercase tracking-wide text-slate-500">Equipos registrados</div>
            {data.teams.length === 0 ? (
              <div className="text-2xl text-slate-400">Esperando a la primera mesa…</div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {data.teams.map((team) => (
                  <div key={team.id} className="truncate rounded-xl border border-slate-200 bg-white px-4 py-3 text-xl font-semibold text-slate-800">
                    ✓ {team.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <div className="mb-3 text-lg font-semibold uppercase tracking-wide text-slate-500">Ranking · Valor de la Tienda</div>
          {ranking.length === 0 ? (
            <div className="text-2xl text-slate-400">Esperando resultados…</div>
          ) : (
            <ol className="space-y-2">
              {ranking.slice(0, 10).map((t) => (
                <li key={t.id} className={cx("flex items-center gap-5 rounded-xl border px-5 py-3", t.rank === 1 ? "border-gold-200 bg-gold-50" : "border-slate-200 bg-white")}>
                  <span className={cx("tabular flex h-11 w-11 items-center justify-center rounded-lg text-2xl font-black", t.rank === 1 ? "bg-gold-100 text-gold-700" : t.rank <= 3 ? "bg-slate-100 text-slate-600" : "text-slate-400")}>{t.rank}</span>
                  <span className="flex-1 truncate text-2xl font-semibold text-slate-800">{t.name}</span>
                  <span className="tabular text-2xl font-black text-slate-900">{money(t.score_total)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="mt-8 flex items-center gap-2 text-sm text-slate-400">
        <span className={cx("h-2 w-2 rounded-full", data.connected ? "bg-brand-500" : "bg-amber-500")} />
        {data.connected ? "En vivo" : "Reconectando…"} · {data.teams.length} equipos
      </div>
    </main>
  );
}

function useCountdown(closesAt: string | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!closesAt) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [closesAt]);
  return closesAt ? Math.max(0, new Date(closesAt).getTime() - now) : 0;
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
