"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Callout,
  Card,
  Field,
  Input,
  PageShell,
  Spinner,
  Stat,
  cx,
} from "@/components/ui";
import { DemandBars, Indicators, Ranking } from "@/components/game";
import {
  readFacilitatorCreds,
  saveFacilitatorCreds,
  type FacilitatorCreds,
} from "@/lib/facilitator";
import { rankingFrom } from "@/lib/derive";
import { ROUND_TEMPLATES, HINT_LABELS } from "@/lib/constants";
import { int, money, percent } from "@/lib/format";
import type { ParticipantRow, ResultRow, RoundRow, SessionRow } from "@/lib/types";

type FacRound = RoundRow & { planned_demand: number | null };
type FacState = {
  session: SessionRow;
  rounds: FacRound[];
  participants: ParticipantRow[];
  results: ResultRow[];
  currentDecisions: { participant_id: string; quantity: number }[];
};

export default function FacilitatorControlPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  return <Gate code={code.toUpperCase()} />;
}

// -------------------------------------------------------------- PIN gate ---
function Gate({ code }: { code: string }) {
  const [creds, setCreds] = useState<FacilitatorCreds | null | "loading">("loading");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const stored = readFacilitatorCreds(code);
    setCreds(stored ?? null);
  }, [code]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setChecking(true);
    try {
      const res = await fetch("/api/facilitator/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, pin }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "PIN incorrecto.");
      } else {
        const c = { code, pin };
        saveFacilitatorCreds(c);
        setCreds(c);
      }
    } catch {
      setError("Error de red.");
    } finally {
      setChecking(false);
    }
  }

  if (creds === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6 text-slate-400" />
      </main>
    );
  }

  if (!creds) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
        <Link href="/facilitator" className="mb-4 text-sm text-slate-500">
          ← Volver
        </Link>
        <Card title={`Panel · Sala ${code}`}>
          <form onSubmit={verify} className="space-y-4">
            <Field label="PIN de facilitador">
              <Input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoFocus
                className="text-center text-2xl font-bold tracking-widest"
              />
            </Field>
            {error && <Callout tone="error">{error}</Callout>}
            <Button type="submit" size="lg" className="w-full" disabled={checking}>
              {checking ? <Spinner /> : "Entrar al panel"}
            </Button>
          </form>
        </Card>
      </main>
    );
  }

  return <Control creds={creds} />;
}

// ------------------------------------------------------------ Panel ---------
function Control({ creds }: { creds: FacilitatorCreds }) {
  const { code, pin } = creds;
  const [state, setState] = useState<FacState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/facilitator/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, pin }),
      });
      const json = await res.json();
      if (res.ok) {
        setState(json as FacState);
        setError(null);
      } else {
        setError(json.error ?? "No se pudo cargar el estado.");
      }
    } catch {
      setError("Error de red al actualizar.");
    }
  }, [code, pin]);

  // Carga inicial + polling en vivo.
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 2500);
    return () => clearInterval(id);
  }, [refresh]);

  // Selecciona por defecto la ronda activa.
  useEffect(() => {
    if (selected === null && state) {
      const active =
        state.session.current_round > 0
          ? state.session.current_round
          : state.rounds.find((r) => r.status !== "revealed")?.round_number ?? 1;
      setSelected(active);
    }
  }, [state, selected]);

  async function action(path: string, roundNumber: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, pin, roundNumber }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "La acción falló.");
      await refresh();
    } catch {
      setError("Error de red.");
    } finally {
      setBusy(false);
    }
  }

  if (!state) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        {error ? <Callout tone="error">{error}</Callout> : <Spinner className="h-6 w-6 text-slate-400" />}
      </main>
    );
  }

  const { session, rounds, participants, results, currentDecisions } = state;
  const selectedRound = rounds.find((r) => r.round_number === selected) ?? rounds[0];
  const ranking = rankingFrom(results, participants);
  const submittedIds = new Set(currentDecisions.map((d) => d.participant_id));
  const qtyById = new Map(currentDecisions.map((d) => [d.participant_id, d.quantity]));

  // Indicadores agregados del grupo (sobre resultados revelados).
  const revealedCount = rounds.filter((r) => r.status === "revealed").length;
  const totalLost = results.reduce((s, r) => s + r.lost_sales, 0);
  const totalLeftover = results.reduce((s, r) => s + r.leftover, 0);
  const avgService =
    results.length > 0
      ? results.reduce((s, r) => s + r.service_level, 0) / results.length
      : 0;

  return (
    <PageShell
      title={session.name}
      subtitle={`Kiosco de ${session.product_label} · ${participants.length} participantes`}
      right={
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs uppercase text-slate-400">Código</div>
            <div className="font-mono text-2xl font-black tracking-widest text-brand-700">
              {code}
            </div>
          </div>
          <CopyLink code={code} />
        </div>
      }
    >
      {error && (
        <div className="mb-4">
          <Callout tone="error">{error}</Callout>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Columna principal: control de ronda + envíos */}
        <div className="space-y-5 lg:col-span-2">
          {/* Selector de rondas */}
          <div className="flex flex-wrap gap-2">
            {rounds.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r.round_number)}
                className={cx(
                  "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                  r.round_number === selected
                    ? "border-brand-400 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                Ronda {r.round_number}
                <span className="ml-2">
                  <StatusDot status={r.status} />
                </span>
              </button>
            ))}
          </div>

          {selectedRound && (
            <RoundControl
              key={selectedRound.id}
              round={selectedRound}
              busy={busy}
              onAction={action}
              onSave={async (patch) => {
                setBusy(true);
                try {
                  const res = await fetch("/api/rounds/update", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ code, pin, roundNumber: selectedRound.round_number, ...patch }),
                  });
                  const json = await res.json();
                  if (!res.ok) setError(json.error ?? "No se pudo guardar.");
                  await refresh();
                } finally {
                  setBusy(false);
                }
              }}
              currency={session.currency}
            />
          )}

          {/* Envíos de la ronda actual */}
          <Card
            title={`Envíos · Ronda ${session.current_round || "—"}`}
            aside={
              <span className="text-sm font-semibold text-slate-500">
                {submittedIds.size} de {participants.length} enviaron
              </span>
            }
          >
            {participants.length === 0 ? (
              <p className="text-sm text-slate-400">Aún no se ha unido nadie.</p>
            ) : (
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {participants.map((p) => {
                  const done = submittedIds.has(p.id);
                  return (
                    <li
                      key={p.id}
                      className={cx(
                        "flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm",
                        done ? "border-brand-200 bg-brand-50" : "border-slate-200 bg-white",
                      )}
                    >
                      <span className="truncate text-slate-700">{p.name}</span>
                      <span
                        className={cx(
                          "tabular font-semibold",
                          done ? "text-brand-700" : "text-slate-400",
                        )}
                      >
                        {done ? qtyById.get(p.id) : "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Columna lateral: ranking + indicadores + demandas */}
        <div className="space-y-5">
          <Card title="Ranking general">
            <Ranking ranking={ranking} currency={session.currency} />
          </Card>

          <Card title="Indicadores del grupo">
            <div className="grid grid-cols-2 gap-2">
              <Stat tone="brand" label="Rondas reveladas" value={`${revealedCount}/${session.total_rounds}`} />
              <Stat tone="info" label="Nivel servicio prom." value={percent(avgService)} />
              <Stat tone="loss" label="Ventas perdidas" value={int(totalLost)} />
              <Stat tone="warn" label="Sobrantes totales" value={int(totalLeftover)} />
            </div>
          </Card>

          <Card title="Demanda por ronda (secreta)">
            <table className="w-full text-sm tabular">
              <tbody>
                {rounds.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-1.5 text-slate-500">Ronda {r.round_number}</td>
                    <td className="py-1.5 text-right font-semibold text-slate-800">
                      {r.status === "revealed" ? (
                        <span className="text-brand-700">{r.real_demand}</span>
                      ) : (
                        <span>{r.planned_demand ?? "—"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

// ---------------------------------------------------- Control de una ronda ---
function RoundControl({
  round,
  busy,
  onAction,
  onSave,
  currency,
}: {
  round: FacRound;
  busy: boolean;
  onAction: (path: string, roundNumber: number) => void;
  onSave: (patch: {
    price?: number;
    cost?: number;
    salvage?: number;
    realDemand?: number;
    history?: number[];
  }) => void;
  currency: string;
}) {
  const template = ROUND_TEMPLATES[round.round_number - 1];
  const editable = round.status !== "revealed";
  const [price, setPrice] = useState(String(round.price));
  const [cost, setCost] = useState(String(round.cost));
  const [salvage, setSalvage] = useState(String(round.salvage));
  const [demand, setDemand] = useState(String(round.planned_demand ?? ""));
  const [history, setHistory] = useState((round.hint_data?.history ?? []).join(", "));

  const showHistory = round.hint_type === "history" || round.hint_type === "indicators";

  return (
    <Card
      title={`Ronda ${round.round_number} · ${template?.title ?? ""}`}
      aside={<Badge tone={round.status}>{HINT_LABELS[round.hint_type] ?? round.hint_type}</Badge>}
    >
      {template && (
        <p className="mb-4 text-sm text-slate-500">
          <span className="font-semibold text-slate-600">Objetivo:</span>{" "}
          {template.objective}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label={`Precio (${currency})`}>
          <Input type="number" value={price} disabled={!editable} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label={`Costo (${currency})`}>
          <Input type="number" value={cost} disabled={!editable} onChange={(e) => setCost(e.target.value)} />
        </Field>
        <Field label={`Recup. (${currency})`}>
          <Input type="number" value={salvage} disabled={!editable} onChange={(e) => setSalvage(e.target.value)} />
        </Field>
        <Field
          label={
            <>
              Demanda real{" "}
              <span className="font-normal text-slate-400">· oculta</span>
            </>
          }
        >
          <Input
            type="number"
            value={demand}
            disabled={!editable}
            onChange={(e) => setDemand(e.target.value)}
            className="border-brand-200 bg-brand-50/50"
          />
        </Field>
      </div>

      {showHistory && (
        <div className="mt-3">
          <Field label="Demanda histórica (pista)" hint="Separada por coma.">
            <Input value={history} disabled={!editable} onChange={(e) => setHistory(e.target.value)} />
          </Field>
          {history.trim() && (
            <div className="mt-2">
              {round.hint_type === "indicators" ? (
                <Indicators history={parseList(history)} />
              ) : (
                <DemandBars history={parseList(history)} />
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {editable && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              onSave({
                price: parseFloat(price),
                cost: parseFloat(cost),
                salvage: parseFloat(salvage),
                realDemand: parseInt(demand, 10),
                ...(showHistory ? { history: parseList(history) } : {}),
              })
            }
          >
            Guardar cambios
          </Button>
        )}

        <div className="ml-auto flex gap-2">
          {round.status === "pending" && (
            <Button variant="success" disabled={busy} onClick={() => onAction("/api/rounds/open", round.round_number)}>
              Abrir ronda
            </Button>
          )}
          {round.status === "open" && (
            <Button variant="danger" disabled={busy} onClick={() => onAction("/api/rounds/close", round.round_number)}>
              Cerrar ronda
            </Button>
          )}
          {round.status === "closed" && (
            <Button disabled={busy} onClick={() => onAction("/api/rounds/reveal", round.round_number)}>
              Revelar resultados
            </Button>
          )}
          {round.status === "revealed" && (
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700">
              Demanda real: {round.real_demand} · resultados publicados
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

function parseList(text: string): number[] {
  return text
    .split(/[,\s]+/)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n >= 0);
}

function StatusDot({ status }: { status: RoundRow["status"] }) {
  const color =
    status === "open"
      ? "bg-brand-500"
      : status === "closed"
        ? "bg-accent-500"
        : status === "revealed"
          ? "bg-gold-600"
          : "bg-slate-300";
  return <span className={cx("inline-block h-2 w-2 rounded-full", color)} />;
}

function CopyLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        const url = `${window.location.origin}/join?code=${code}`;
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
    >
      {copied ? "¡Copiado!" : "Copiar enlace"}
    </Button>
  );
}
