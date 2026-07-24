"use client";

import {
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
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
import {
  facilitatorStorageKey,
  saveFacilitatorCreds,
  type FacilitatorCreds,
} from "@/lib/facilitator";
import { rankTeams } from "@/lib/v2/derive";
import { money, percent } from "@/lib/format";
import type {
  KpiSnapshotRow,
  ProductRow,
  RoundRow,
  SessionRow,
  SupplyConfig,
  TeamRow,
} from "@/lib/v2/types";

export default function FacilitatorControlPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return <Gate code={code.toUpperCase()} />;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Por abrir",
  open: "Abierta",
  closed: "Cerrada",
  revealed: "Revelada",
};

function Gate({ code }: { code: string }) {
  const stored = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      return () => window.removeEventListener("storage", onChange);
    },
    () => window.localStorage.getItem(facilitatorStorageKey(code)),
    () => null,
  );
  const storedCreds = useMemo(() => {
    if (!stored) return null;
    try {
      return JSON.parse(stored) as FacilitatorCreds;
    } catch {
      return null;
    }
  }, [stored]);
  const [verifiedCreds, setVerifiedCreds] = useState<FacilitatorCreds | null>(null);
  const creds = verifiedCreds ?? storedCreds;
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setChecking(true);
    try {
      const res = await fetch("/api/v2/facilitator/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, pin }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "PIN incorrecto.");
      else {
        const c = { code, pin };
        saveFacilitatorCreds(c);
        setVerifiedCreds(c);
      }
    } catch {
      setError("Error de red.");
    } finally {
      setChecking(false);
    }
  }

  if (!creds) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
        <Link href="/facilitator" className="mb-4 text-sm text-slate-500">← Volver</Link>
        <Card title={`Panel · Sala ${code}`}>
          <form onSubmit={verify} className="space-y-4">
            <Field label="PIN de facilitador (6 dígitos)">
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

type FacState = {
  session: SessionRow;
  rounds: RoundRow[];
  teams: TeamRow[];
  products: ProductRow[];
  demandPlan: { round_id: string; product_id: string; planned_demand: number }[];
  snapshots: KpiSnapshotRow[];
  roundPlans: { round_id: string; supply_config: SupplyConfig | null; facilitator_notes: string | null }[];
  submittedTeamIds: string[];
};

function Control({ creds }: { creds: FacilitatorCreds }) {
  const { code, pin } = creds;
  const [state, setState] = useState<FacState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/v2/facilitator/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, pin }),
      });
      const json = await res.json();
      if (res.ok) { setState(json as FacState); setError(null); }
      else setError(json.error ?? "No se pudo cargar el estado.");
    } catch {
      setError("Error de red al actualizar.");
    }
  }, [code, pin]);

  useEffect(() => {
    queueMicrotask(refresh);
    const id = setInterval(refresh, 2500);
    return () => clearInterval(id);
  }, [refresh]);

  const action = useCallback(async (path: string, roundNumber: number) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, pin, roundNumber }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "La acción falló.");
      await refresh();
    } catch { setError("Error de red."); } finally { setBusy(false); }
  }, [code, pin, refresh]);

  const openRound = state?.rounds.find((r) => r.status === "open") ?? null;
  useEffect(() => {
    if (!openRound?.closes_at) return;
    let requested = false;
    const tick = () => {
      if (!requested && Date.now() >= new Date(openRound.closes_at!).getTime()) {
        requested = true;
        void action("/api/v2/rounds/close", openRound.round_number);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [action, openRound?.closes_at, openRound?.round_number]);

  async function saveDemands(roundNumber: number, demands: { productId: string; planned: number }[]) {
    setBusy(true);
    try {
      const res = await fetch("/api/v2/rounds/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, pin, roundNumber, demands }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "No se pudo guardar la demanda.");
      await refresh();
    } finally { setBusy(false); }
  }

  async function saveRoundTime(roundNumber: number, seconds: number) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v2/rounds/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, pin, roundNumber, seconds }),
      });
      const json = await response.json();
      if (!response.ok) setError(json.error ?? "No se pudo cambiar el tiempo.");
      await refresh();
    } catch {
      setError("Error de red.");
    } finally {
      setBusy(false);
    }
  }

  async function kick(teamId: string) {
    setBusy(true);
    try {
      await fetch("/api/v2/facilitator/kick", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, pin, teamId }),
      });
      await refresh();
    } finally { setBusy(false); }
  }

  async function toggleRegistration(open: boolean) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v2/facilitator/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, pin, open }),
      });
      const json = await response.json();
      if (!response.ok) setError(json.error ?? "No se pudo cambiar la inscripción.");
      await refresh();
    } catch {
      setError("Error de red.");
    } finally {
      setBusy(false);
    }
  }

  if (!state) {
    return <main className="flex min-h-[70vh] items-center justify-center">{error ? <Callout tone="error">{error}</Callout> : <Spinner className="h-6 w-6 text-slate-400" />}</main>;
  }

  const { session, rounds, teams, products, demandPlan, snapshots, roundPlans, submittedTeamIds } = state;
  const defaultSelected = session.current_round > 0
    ? session.current_round
    : rounds.find((r) => r.status !== "revealed")?.round_number ?? 1;
  const selectedNumber = selected ?? defaultSelected;
  const selectedRound = rounds.find((r) => r.round_number === selectedNumber) ?? rounds[0];
  const ranking = rankTeams(teams, snapshots);
  const submitted = new Set(submittedTeamIds);

  const revealedCount = rounds.filter((r) => r.status === "revealed").length;
  const avgService = teams.length
    ? teams.reduce((s, t) => s + (t.rounds_played > 0 ? t.service_sum / t.rounds_played : 0), 0) / teams.length
    : 0;
  const totalMerma = snapshots.reduce((s, k) => s + k.spoilage_cost, 0);
  const totalDebt = teams.reduce((s, t) => s + Number(t.debt), 0);

  return (
    <PageShell
      title={session.name}
      subtitle={`${teams.length} equipos · Semana ${session.current_round || "—"}/${session.total_rounds}`}
      right={
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs uppercase text-slate-400">Código</div>
            <div className="font-mono text-2xl font-black tracking-widest text-brand-700">{code}</div>
          </div>
          <Link href={`/facilitator/${code}/carteles`} target="_blank">
            <Button variant="secondary">Recuperación</Button>
          </Link>
          <Link href={`/proyector/${code}`} target="_blank">
            <Button variant="secondary">Proyectar</Button>
          </Link>
        </div>
      }
    >
      {error && <div className="mb-4"><Callout tone="error">{error}</Callout></div>}

      {session.status === "lobby" && (
        <div className="mb-5">
          <Card
            title="Inscripción de equipos"
            aside={
              <Badge tone={session.registration_open ? "open" : "closed"}>
                {session.registration_open ? "Abierta" : "Cerrada"}
              </Badge>
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-2xl font-black text-slate-900">
                  {teams.length}/{session.max_teams}
                </div>
                <p className="text-sm text-slate-500">
                  Comparte <b className="font-mono text-brand-700">{code}</b> o el enlace de ingreso.
                  Al abrir R1 las inscripciones se cierran automáticamente.
                </p>
              </div>
              <Button
                variant={session.registration_open ? "danger" : "success"}
                disabled={busy}
                onClick={() => toggleRegistration(!session.registration_open)}
              >
                {session.registration_open ? "Cerrar inscripciones" : "Reabrir inscripciones"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* selector de semanas */}
          <div className="flex flex-wrap gap-2">
            {rounds.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r.round_number)}
                className={cx(
                  "rounded-md border px-3 py-2 text-sm font-semibold transition",
                  r.round_number === selectedNumber ? "border-brand-400 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                Sem {r.round_number}
                <span className="ml-2"><StatusDot status={r.status} /></span>
              </button>
            ))}
          </div>

          {selectedRound && (
            <RoundControl
              key={selectedRound.id}
              round={selectedRound}
              products={products}
              demandPlan={demandPlan}
              plan={roundPlans.find((p) => p.round_id === selectedRound.id)}
              busy={busy}
              onAction={action}
              onSaveDemands={(d) => saveDemands(selectedRound.round_number, d)}
              onSetTime={(seconds) => saveRoundTime(selectedRound.round_number, seconds)}
            />
          )}

          {/* semáforo de equipos */}
          <Card
            title={session.status === "lobby" ? "Equipos registrados" : `Equipos · pedidos de la semana ${session.current_round}`}
            aside={
              <span className="text-sm font-semibold text-slate-500">
                {session.status === "lobby" ? `${teams.length}/${session.max_teams}` : `${submitted.size} de ${teams.length} enviaron`}
              </span>
            }
          >
            {teams.length === 0 ? (
              <p className="text-sm text-slate-400">Aún no hay equipos.</p>
            ) : (
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {teams.map((t) => {
                  const done = submitted.has(t.id);
                  return (
                    <li key={t.id} className={cx("flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm", done ? "border-brand-200 bg-brand-50" : "border-slate-200 bg-white")}>
                      <span className="flex items-center gap-2 truncate">
                        <span className={cx("h-2 w-2 shrink-0 rounded-full", done ? "bg-brand-500" : "bg-slate-300")} />
                        <span className="truncate text-slate-700">{t.name}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="tabular text-xs text-slate-500">{money(Number(t.cash))}</span>
                        {session.status === "lobby" && (
                          <button onClick={() => kick(t.id)} className="text-xs text-slate-400 hover:text-danger-600" title="Expulsar">
                            quitar
                          </button>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Ranking · Valor de la Tienda">
            {ranking.length === 0 ? <p className="text-sm text-slate-400">Sin resultados aún.</p> : (
              <ol className="divide-y divide-slate-100">
                {ranking.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-2">
                    <span className={cx("tabular flex h-6 w-6 items-center justify-center rounded text-xs font-bold", t.rank === 1 ? "bg-gold-100 text-gold-700" : t.rank <= 3 ? "bg-slate-100 text-slate-600" : "text-slate-400")}>{t.rank}</span>
                    <span className="flex-1 truncate text-sm font-medium text-slate-800">{t.name}</span>
                    <span className="tabular text-sm font-bold text-slate-900">{money(t.score_total)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card title="Indicadores del grupo">
            <div className="grid grid-cols-2 gap-2">
              <Stat tone="brand" label="Semanas reveladas" value={`${revealedCount}/${session.total_rounds}`} />
              <Stat tone="info" label="Clientes atendidos (prom.)" value={percent(avgService)} />
              <Stat tone="warn" label="Pérdida por vencimiento" value={money(totalMerma)} />
              <Stat tone="loss" label="Deuda total" value={money(totalDebt)} />
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function RoundControl({
  round,
  products,
  demandPlan,
  plan,
  busy,
  onAction,
  onSaveDemands,
  onSetTime,
}: {
  round: RoundRow;
  products: ProductRow[];
  demandPlan: { round_id: string; product_id: string; planned_demand: number }[];
  plan?: { supply_config: SupplyConfig | null; facilitator_notes: string | null };
  busy: boolean;
  onAction: (path: string, roundNumber: number) => void;
  onSaveDemands: (d: { productId: string; planned: number }[]) => void;
  onSetTime: (seconds: number) => void;
}) {
  const editable = round.status !== "revealed";
  const seed = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of products) {
      const dp = demandPlan.find((d) => d.round_id === round.id && d.product_id === p.id);
      m[p.id] = String(dp?.planned_demand ?? 0);
    }
    return m;
  }, [round.id, products, demandPlan]);
  const [demands, setDemands] = useState<Record<string, string>>(seed);
  const [timeMinutes, setTimeMinutes] = useState(() => String(round.duration_seconds / 60));
  const remaining = useCountdown(round.status === "open" ? round.closes_at : null);

  const supply = plan?.supply_config;

  return (
    <Card
      title={`Semana ${round.round_number} · ${round.title}`}
      aside={<Badge tone={round.status}>{STATUS_LABEL[round.status]}</Badge>}
    >
      {plan?.facilitator_notes && <p className="mb-3 text-sm text-slate-500"><span className="font-semibold text-slate-600">Nota:</span> {plan.facilitator_notes}</p>}
      {round.status === "open" && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-brand-200 bg-brand-50 px-3 py-2">
          <span className="text-sm font-semibold text-brand-800">Cierre automático</span>
          <span className="font-mono text-2xl font-black tabular-nums text-brand-800">
            {formatCountdown(remaining)}
          </span>
        </div>
      )}

      {(round.status === "pending" || round.status === "open") && (
        <div className="mb-4 flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
          <Field
            label={round.status === "open" ? "Reemplazar tiempo restante" : "Duración de esta semana"}
            hint="Entre 0,5 y 120 minutos."
          >
            <Input
              type="number"
              min={0.5}
              max={120}
              step={0.5}
              value={timeMinutes}
              onChange={(event) => setTimeMinutes(event.target.value)}
              className="w-28"
            />
          </Field>
          <Button
            variant="secondary"
            disabled={busy || !Number.isFinite(Number(timeMinutes)) || Number(timeMinutes) < 0.5}
            onClick={() => onSetTime(Math.round(Number(timeMinutes) * 60))}
          >
            Guardar tiempo
          </Button>
          {round.status === "open" && (
            <span className="pb-2 text-xs text-slate-500">
              El reloj comenzará desde este valor al guardar.
            </span>
          )}
        </div>
      )}

      {supply && (
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <span className={cx("rounded border px-2 py-0.5", supply.principalAvailable ? "border-brand-200 bg-brand-50 text-brand-700" : "border-slate-200 bg-slate-50 text-slate-500")}>
            Camión: {supply.principalAvailable ? "atiende" : "no atiende"}
          </span>
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">Tope Don Lucho: {supply.luchoCap}</span>
          {supply.deliveryFactor < 1 && <span className="rounded border border-accent-200 bg-accent-50 px-2 py-0.5 text-accent-700">Entrega camión al {Math.round(supply.deliveryFactor * 100)}%</span>}
        </div>
      )}

      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Demanda real (secreta)</div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {products.map((p) => (
          <label key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-2 py-1.5">
            <span className="truncate text-xs text-slate-600">{p.name}</span>
            <input
              value={demands[p.id] ?? "0"}
              disabled={!editable}
              onChange={(e) => setDemands((d) => ({ ...d, [p.id]: e.target.value.replace(/\D/g, "") }))}
              className="tabular w-14 rounded border border-slate-300 px-1 py-0.5 text-right text-sm disabled:bg-slate-100"
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {editable && (
          <Button variant="secondary" disabled={busy} onClick={() => onSaveDemands(products.map((p) => ({ productId: p.id, planned: parseInt(demands[p.id] || "0", 10) || 0 })))}>
            Guardar demanda
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          {round.status === "pending" && <Button variant="success" disabled={busy} onClick={() => onAction("/api/v2/rounds/open", round.round_number)}>Abrir semana</Button>}
          {round.status === "open" && <Button variant="danger" disabled={busy} onClick={() => onAction("/api/v2/rounds/close", round.round_number)}>Cerrar ahora</Button>}
          {round.status === "closed" && <Button disabled={busy} onClick={() => onAction("/api/v2/rounds/reveal", round.round_number)}>Revelar resultados</Button>}
          {round.status === "revealed" && <span className="text-sm font-semibold text-brand-700">Resultados publicados</span>}
        </div>
      </div>
    </Card>
  );
}

function StatusDot({ status }: { status: RoundRow["status"] }) {
  const color = status === "open" ? "bg-brand-500" : status === "closed" ? "bg-accent-500" : status === "revealed" ? "bg-gold-600" : "bg-slate-300";
  return <span className={cx("inline-block h-2 w-2 rounded-full", color)} />;
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
