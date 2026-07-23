"use client";

import { use, useEffect, useMemo, useState } from "react";
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
} from "@/components/ui";
import {
  DemandBars,
  Indicators,
  ParticipantHistory,
  Ranking,
  RoundResultCard,
} from "@/components/game";
import { useSessionData } from "@/lib/useSessionData";
import {
  cumulativeProfit,
  participantResults,
  rankingFrom,
  resultRowToOutcome,
} from "@/lib/derive";
import { readParticipant, type ParticipantIdentity } from "@/lib/participant";
import { ROUND_TEMPLATES } from "@/lib/constants";
import { money } from "@/lib/format";
import type { RoundRow } from "@/lib/types";

export default function PlayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  return <Play code={code.toUpperCase()} />;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Por abrir",
  open: "Abierta",
  closed: "Cerrada",
  revealed: "Revelada",
};

function Play({ code }: { code: string }) {
  const [identity, setIdentity] = useState<ParticipantIdentity | null | "loading">(
    "loading",
  );
  useEffect(() => setIdentity(readParticipant(code)), [code]);

  const data = useSessionData(code);

  if (identity === "loading" || data.loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6 text-slate-400" />
      </main>
    );
  }

  if (data.error || !data.session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <Callout tone="error">{data.error ?? "Sala no encontrada."}</Callout>
        <Link href="/join" className="mt-4 text-center text-sm text-brand-700">
          ← Volver a unirme
        </Link>
      </main>
    );
  }

  if (!identity) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <Card title="Necesitas unirte">
          <p className="text-sm text-slate-600">
            No encontramos tu registro en la sala{" "}
            <span className="font-bold">{code}</span>. Únete para participar.
          </p>
          <Link href={`/join?code=${code}`}>
            <Button className="mt-4 w-full" size="lg">
              Unirme a la sala {code}
            </Button>
          </Link>
        </Card>
      </main>
    );
  }

  return <PlayBoard code={code} identity={identity} data={data} />;
}

function PlayBoard({
  code,
  identity,
  data,
}: {
  code: string;
  identity: ParticipantIdentity;
  data: ReturnType<typeof useSessionData>;
}) {
  const { session, rounds, participants, results } = data;
  const currency = session!.currency;
  const myId = identity.participantId;

  const currentRound = useMemo(
    () => rounds.find((r) => r.round_number === session!.current_round) ?? null,
    [rounds, session],
  );
  const myResults = useMemo(
    () => participantResults(results, myId),
    [results, myId],
  );
  const myCumulative = cumulativeProfit(results, myId);
  const ranking = useMemo(
    () => rankingFrom(results, participants),
    [results, participants],
  );
  const myRank = ranking.find((r) => r.participantId === myId)?.rank;

  return (
    <PageShell
      title={session!.name}
      subtitle={
        <>
          Kiosco de {session!.product_label} · Sala{" "}
          <span className="font-mono font-semibold">{code}</span> · {identity.name}
        </>
      }
      right={
        <div className="flex gap-2">
          <Stat
            tone="profit"
            label="Ganancia acumulada"
            value={money(myCumulative, currency)}
            sub={myRank ? `Puesto ${myRank} de ${ranking.length}` : undefined}
          />
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {session!.status === "lobby" || !currentRound ? (
            <Card title="Sala en espera">
              <p className="text-slate-600">
                Espera a que el facilitador inicie la{" "}
                <strong>Ronda 1</strong>. Prepárate para decidir cuántas unidades
                producir.
              </p>
            </Card>
          ) : (
            <RoundPanel
              round={currentRound}
              identity={identity}
              myOutcomeRow={myResults.find(
                (r) => r.round_number === currentRound.round_number,
              )}
              prevOutcomeRow={myResults.find(
                (r) => r.round_number === currentRound.round_number - 1,
              )}
              currency={currency}
            />
          )}

          <Card title="Tu historial">
            <ParticipantHistory results={myResults} currency={currency} />
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Ranking parcial">
            <Ranking ranking={ranking} currency={currency} highlightId={myId} />
          </Card>
          {session!.status === "finished" && ranking[0] && (
            <Callout tone="success">
              🏆 Ganador: <strong>{ranking[0].name}</strong> con{" "}
              {money(ranking[0].cumulativeProfit, currency)}.
            </Callout>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function RoundPanel({
  round,
  identity,
  myOutcomeRow,
  prevOutcomeRow,
  currency,
}: {
  round: RoundRow;
  identity: ParticipantIdentity;
  myOutcomeRow: ReturnType<typeof participantResults>[number] | undefined;
  prevOutcomeRow: ReturnType<typeof participantResults>[number] | undefined;
  currency: string;
}) {
  const template = ROUND_TEMPLATES[round.round_number - 1];
  const history = round.hint_data?.history ?? [];

  return (
    <Card
      title={`Ronda ${round.round_number}${template ? " · " + template.title : ""}`}
      aside={<Badge tone={round.status}>{STATUS_LABEL[round.status]}</Badge>}
    >
      <div className="mb-4 grid grid-cols-3 gap-2">
        <Stat tone="info" label="Precio de venta" value={money(round.price, currency)} />
        <Stat tone="neutral" label="Costo unitario" value={money(round.cost, currency)} />
        <Stat tone="warn" label="Recup. si sobra" value={money(round.salvage, currency)} />
      </div>

      {/* Pistas según la ronda */}
      {round.hint_type === "previous" && prevOutcomeRow && (
        <Callout tone="info">
          En la ronda anterior preparaste{" "}
          <strong>{prevOutcomeRow.quantity}</strong> y la demanda fue{" "}
          <strong>{prevOutcomeRow.real_demand}</strong> (sobraron{" "}
          {prevOutcomeRow.leftover}, perdiste {prevOutcomeRow.lost_sales}).
        </Callout>
      )}
      {round.hint_type === "history" && history.length > 0 && (
        <div className="mb-2">
          <p className="mb-2 text-sm text-slate-500">Demanda de días anteriores:</p>
          <DemandBars history={history} />
        </div>
      )}
      {round.hint_type === "indicators" && history.length > 0 && (
        <div className="mb-2">
          <p className="mb-2 text-sm text-slate-500">Indicadores de la demanda:</p>
          <Indicators history={history} />
        </div>
      )}

      <div className="mt-4">
        {round.status === "revealed" && myOutcomeRow ? (
          <RoundResultCard
            outcome={resultRowToOutcome(myOutcomeRow)}
            currency={currency}
            title="Tu resultado"
          />
        ) : round.status === "open" ? (
          <DecisionForm round={round} identity={identity} />
        ) : round.status === "closed" ? (
          <Callout tone="warn">
            Ronda cerrada. Espera a que el facilitador revele la demanda real…
          </Callout>
        ) : (
          <Callout tone="info">Esta ronda todavía no está abierta.</Callout>
        )}
      </div>
    </Card>
  );
}

function decisionKey(roundId: string) {
  return `sp:decision:${roundId}`;
}

function DecisionForm({
  round,
  identity,
}: {
  round: RoundRow;
  identity: ParticipantIdentity;
}) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(decisionKey(round.id));
    if (stored !== null) {
      setSubmitted(Number(stored));
      setValue(stored);
    } else {
      setSubmitted(null);
      setValue("");
    }
  }, [round.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const qty = Math.round(Number(value));
    if (!Number.isFinite(qty) || qty < 0) {
      setError("Ingresa una cantidad válida (0 o más).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: identity.participantId,
          token: identity.token,
          roundId: round.id,
          quantity: qty,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo enviar la decisión.");
      } else {
        setSubmitted(qty);
        localStorage.setItem(decisionKey(round.id), String(qty));
      }
    } catch {
      setError("Error de red al enviar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field
        label="¿Cuántas unidades prepararás?"
        hint="Puedes cambiar tu decisión hasta que el facilitador cierre la ronda."
      >
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ej: 55"
          className="text-center text-2xl font-bold"
        />
      </Field>
      {error && <Callout tone="error">{error}</Callout>}
      {submitted !== null && !error && (
        <Callout tone="success">
          Decisión registrada: <strong>{submitted} unidades</strong>. Puedes
          actualizarla si quieres.
        </Callout>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? <Spinner /> : submitted !== null ? "Actualizar decisión" : "Enviar decisión"}
      </Button>
    </form>
  );
}
