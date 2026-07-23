// Componentes visuales específicos del juego (presentacionales).
import type { ReactNode } from "react";
import { computeIndicators, type RoundOutcome } from "@/lib/game";
import type { ResultRow } from "@/lib/types";
import { int, money, percent, signedMoney } from "@/lib/format";
import { Card, Stat, cx } from "@/components/ui";

// --------------------------------------------- Demanda histórica (barras) ---
export function DemandBars({ history }: { history: number[] }) {
  if (!history.length) return null;
  const max = Math.max(...history, 1);
  return (
    <div className="space-y-1.5">
      {history.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-xs text-slate-400">Día {i + 1}</span>
          <div className="h-5 flex-1 overflow-hidden rounded-sm bg-slate-100">
            <div
              className="flex h-full items-center justify-end rounded-sm bg-sky-600 pr-1.5 text-[10px] font-semibold text-white"
              style={{ width: `${Math.max(8, (d / max) * 100)}%` }}
            >
              {d}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// -------------------------------------------------- Indicadores de demanda ---
export function Indicators({ history }: { history: number[] }) {
  const ind = computeIndicators(history);
  if (!ind) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat tone="info" label="Promedio" value={ind.average.toFixed(1)} />
      <Stat tone="neutral" label="Mínimo" value={int(ind.min)} />
      <Stat tone="neutral" label="Máximo" value={int(ind.max)} />
      <Stat
        tone="warn"
        label="Variación"
        value={`±${ind.stdDev.toFixed(1)}`}
        sub={`CV ${percent(ind.coefVar)}`}
      />
    </div>
  );
}

// ---------------------------------------- Interpretación de un resultado ---
export function interpretOutcome(o: {
  leftover: number;
  lostSales: number;
}): { tone: "success" | "warn" | "info"; text: string } {
  if (o.leftover === 0 && o.lostSales === 0)
    return { tone: "success", text: "¡Stock perfecto! Igualaste exactamente la demanda." };
  if (o.lostSales > 0)
    return {
      tone: "warn",
      text: "Evitaste sobrantes, pero perdiste ventas: produjiste menos que la demanda real.",
    };
  return {
    tone: "info",
    text: "Cubriste toda la demanda, pero te quedaron unidades sobrantes.",
  };
}

// ------------------------------------- Desglose de una ronda (KPIs) --------
export function RoundResultCard({
  outcome,
  currency,
  title,
}: {
  outcome: RoundOutcome;
  currency: string;
  title?: ReactNode;
}) {
  const interp = interpretOutcome(outcome);
  const interpTone =
    interp.tone === "success"
      ? "border-brand-200 bg-brand-50 text-brand-800"
      : interp.tone === "warn"
        ? "border-accent-200 bg-accent-50 text-accent-700"
        : "border-sky-200 bg-sky-50 text-sky-800";
  return (
    <Card title={title ?? "Resultado de la ronda"}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat tone="info" label="Demanda real" value={int(outcome.realDemand)} />
        <Stat tone="neutral" label="Preparadas" value={int(outcome.quantity)} />
        <Stat tone="neutral" label="Vendidas" value={int(outcome.unitsSold)} />
        <Stat tone="warn" label="Sobrantes" value={int(outcome.leftover)} />
        <Stat tone="loss" label="Ventas perdidas" value={int(outcome.lostSales)} />
        <Stat tone="info" label="Nivel de servicio" value={percent(outcome.serviceLevel)} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat
          tone={outcome.profit >= 0 ? "profit" : "loss"}
          label="Ganancia de la ronda"
          value={signedMoney(outcome.profit, currency)}
          sub={`Ingreso ${money(outcome.revenue, currency)} + recup. ${money(
            outcome.salvageRecovery,
            currency,
          )} − costo ${money(outcome.costTotal, currency)}`}
        />
        <Stat
          tone="brand"
          label="Eficiencia de inventario"
          value={percent(outcome.inventoryEfficiency)}
          sub="Vendidas / preparadas"
        />
      </div>
      <p className={cx("mt-3 rounded-xl border px-4 py-3 text-sm", interpTone)}>
        {interp.text}
      </p>
    </Card>
  );
}

// --------------------------------- Historial de rondas de un participante ---
export function ParticipantHistory({
  results,
  currency,
}: {
  results: ResultRow[];
  currency: string;
}) {
  if (!results.length)
    return (
      <p className="text-sm text-slate-400">
        Aún no hay rondas reveladas. Tu historial aparecerá aquí.
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm tabular">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
            <th className="py-2 pr-2">Ronda</th>
            <th className="px-2">Prep.</th>
            <th className="px-2">Demanda</th>
            <th className="px-2">Vend.</th>
            <th className="px-2">Sobr.</th>
            <th className="px-2">Perd.</th>
            <th className="px-2">Servicio</th>
            <th className="px-2 text-right">Ganancia</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.id} className="border-b border-slate-100">
              <td className="py-2 pr-2 font-semibold">#{r.round_number}</td>
              <td className="px-2">{int(r.quantity)}</td>
              <td className="px-2">{int(r.real_demand)}</td>
              <td className="px-2">{int(r.units_sold)}</td>
              <td className="px-2 text-accent-600">{int(r.leftover)}</td>
              <td className="px-2 text-danger-600">{int(r.lost_sales)}</td>
              <td className="px-2">{percent(r.service_level)}</td>
              <td
                className={cx(
                  "px-2 text-right font-semibold",
                  r.profit >= 0 ? "text-brand-600" : "text-danger-600",
                )}
              >
                {signedMoney(r.profit, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ------------------------------------------------------ Ranking parcial ----
export function Ranking({
  ranking,
  currency,
  highlightId,
}: {
  ranking: {
    participantId: string;
    name: string;
    cumulativeProfit: number;
    totalLostSales: number;
    totalLeftover: number;
    rank: number;
  }[];
  currency: string;
  highlightId?: string;
}) {
  if (!ranking.length)
    return <p className="text-sm text-slate-400">Aún no hay resultados.</p>;
  return (
    <ol className="divide-y divide-slate-100">
      {ranking.map((r) => {
        const isMe = r.participantId === highlightId;
        return (
          <li
            key={r.participantId}
            className={cx(
              "flex items-center gap-3 px-1 py-2",
              isMe && "-mx-1 rounded-md bg-brand-50 px-2",
            )}
          >
            <span
              className={cx(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold tabular",
                r.rank === 1
                  ? "bg-gold-100 text-gold-700"
                  : r.rank <= 3
                    ? "bg-slate-100 text-slate-600"
                    : "text-slate-400",
              )}
            >
              {r.rank}
            </span>
            <span className="flex-1 truncate text-sm font-medium text-slate-800">
              {r.name}
              {isMe && (
                <span className="ml-1 text-xs font-normal text-brand-600">(tú)</span>
              )}
            </span>
            <span className="tabular text-right text-sm font-bold text-slate-900">
              {money(r.cumulativeProfit, currency)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
