"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Badge,
  Button,
  Callout,
  Card,
  PageShell,
  Spinner,
  Stat,
  cx,
} from "@/components/ui";
import { useGameData, type GameData } from "@/lib/v2/useGameData";
import {
  byId,
  currentRound,
  inventoryByProduct,
  latestKpi,
  rankTeams,
} from "@/lib/v2/derive";
import { readTeam, type TeamIdentity } from "@/lib/v2/team";
import { money, int, percent } from "@/lib/format";
import type { RoundRow, SupplyConfig } from "@/lib/v2/types";

// Recharts se carga solo al abrir la pestaña Datos (chunk aparte, no bloquea el flujo).
const DataTab = dynamic(() => import("@/components/v2/DataTab"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center">
      <Spinner className="h-6 w-6 text-slate-400" />
    </div>
  ),
});

export default function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return <TeamGame code={code.toUpperCase()} />;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Por abrir",
  open: "Abierta",
  closed: "Cerrada",
  revealed: "Revelada",
};

function TeamGame({ code }: { code: string }) {
  const [identity, setIdentity] = useState<TeamIdentity | null | "loading">("loading");
  useEffect(() => setIdentity(readTeam(code)), [code]);
  const data = useGameData(code);

  if (identity === "loading" || data.loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center">
        <Spinner className="h-6 w-6 text-slate-400" />
      </main>
    );
  }
  if (data.error || !data.session) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
        <Callout tone="error">{data.error ?? "Sala no encontrada."}</Callout>
        <Link href="/join" className="mt-4 text-center text-sm text-brand-700">
          ← Volver a entrar
        </Link>
      </main>
    );
  }
  if (!identity) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
        <Card title="Necesitas entrar">
          <p className="text-sm text-slate-600">
            No encontramos tu equipo en la sala <b>{code}</b>.
          </p>
          <Link href={`/join?code=${code}`}>
            <Button className="mt-4 w-full" size="lg">Entrar a la sala {code}</Button>
          </Link>
        </Card>
      </main>
    );
  }
  return <Board code={code} identity={identity} data={data} />;
}

type Tab = "inicio" | "tienda" | "pedido" | "datos" | "podio";

type TeamState = {
  availableCash: number;
  myOrders: { offer_id: string; product_id: string; qty: number; total_cost: number }[];
  openRound: { id: string; round_number: number } | null;
};

function Board({
  code,
  identity,
  data,
}: {
  code: string;
  identity: TeamIdentity;
  data: GameData;
}) {
  const { session } = data;
  const round = currentRound(data.rounds, session);
  const isOpen = round?.status === "open";
  const [tab, setTab] = useState<Tab>("inicio");
  const [teamState, setTeamState] = useState<TeamState | null>(null);

  const refreshTeamState = useCallback(async () => {
    try {
      const res = await fetch("/api/v2/teams/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, teamId: identity.teamId, token: identity.token }),
      });
      if (res.ok) {
        const j = await res.json();
        setTeamState({ availableCash: j.availableCash, myOrders: j.myOrders ?? [], openRound: j.openRound });
      }
    } catch {
      /* la robustez del hook cubre lo público; esto es best-effort */
    }
  }, [code, identity.teamId, identity.token]);

  useEffect(() => {
    refreshTeamState();
  }, [refreshTeamState, round?.id, round?.status]);

  const myTeam = data.teams.find((t) => t.id === identity.teamId);
  const ranking = useMemo(() => rankTeams(data.teams, data.kpis), [data.teams, data.kpis]);
  const myRank = ranking.find((t) => t.id === identity.teamId);
  const last = latestKpi(data.kpis, identity.teamId);

  const valorTienda = myTeam
    ? Number(myTeam.score_total)
    : session!.starting_cash;

  const weekLabel =
    session!.current_round > 0 ? `Semana ${session!.current_round}/${session!.total_rounds}` : "Sala en espera";

  return (
    <PageShell
      title={session!.name}
      subtitle={
        <span className="inline-flex items-center gap-2">
          {identity.name} · Sala <span className="font-mono font-semibold">{code}</span>
          <ConnDot connected={data.connected} />
        </span>
      }
      right={
        <Stat
          tone="brand"
          label="Valor de la Tienda"
          value={money(valorTienda)}
          sub={myRank ? `Puesto ${myRank.rank} de ${ranking.length}` : weekLabel}
        />
      }
    >
      {/* barra de semana + evento */}
      <div className="mb-5">
        <RoundBanner round={round} weekLabel={weekLabel} status={session!.status} />
      </div>

      {/* pestañas */}
      <nav className="mb-5 flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        {(["inicio", "tienda", "pedido", "datos", "podio"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx(
              "flex-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold capitalize transition",
              tab === t ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50",
              t === "pedido" && isOpen && tab !== t && "text-brand-700",
            )}
          >
            {t}
            {t === "pedido" && isOpen && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-accent-500 align-middle" />}
          </button>
        ))}
      </nav>

      {tab === "inicio" && <InicioTab data={data} identity={identity} last={last} round={round} onGoPedido={() => setTab("pedido")} />}
      {tab === "tienda" && <TiendaTab data={data} identity={identity} />}
      {tab === "pedido" && (
        <PedidoTab
          code={code}
          identity={identity}
          data={data}
          round={round}
          teamState={teamState}
          onSubmitted={refreshTeamState}
        />
      )}
      {tab === "datos" && <DataTab data={data} teamId={identity.teamId} />}
      {tab === "podio" && <PodioTab ranking={ranking} meId={identity.teamId} finished={session!.status === "finished"} />}
    </PageShell>
  );
}

function ConnDot({ connected }: { connected: boolean }) {
  return (
    <span
      className={cx("inline-flex items-center gap-1 text-xs", connected ? "text-brand-600" : "text-amber-600")}
      title={connected ? "Conectado" : "Reconectando…"}
    >
      <span className={cx("h-2 w-2 rounded-full", connected ? "bg-brand-500" : "bg-amber-500")} />
      {connected ? "En vivo" : "Reconectando…"}
    </span>
  );
}

function RoundBanner({
  round,
  weekLabel,
  status,
}: {
  round: RoundRow | null;
  weekLabel: string;
  status: string;
}) {
  if (status === "lobby" || !round) {
    return (
      <Card>
        <div className="text-sm text-slate-600">
          <b>{weekLabel}.</b> Espera a que el facilitador inicie la primera semana.
        </div>
      </Card>
    );
  }
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {weekLabel} · {round.title}
        </div>
        <Badge tone={round.status}>{STATUS_LABEL[round.status]}</Badge>
      </div>
      {round.event_headline && (
        <div className="mt-2">
          <div className="font-semibold text-slate-900">{round.event_headline}</div>
          {round.event_description && (
            <p className="mt-0.5 text-sm text-slate-600">{round.event_description}</p>
          )}
        </div>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------- Inicio
function InicioTab({
  data,
  identity,
  last,
  round,
  onGoPedido,
}: {
  data: GameData;
  identity: TeamIdentity;
  last: ReturnType<typeof latestKpi>;
  round: RoundRow | null;
  onGoPedido: () => void;
}) {
  const myTeam = data.teams.find((t) => t.id === identity.teamId);
  const invValue = data.lots
    .filter((l) => l.team_id === identity.teamId)
    .reduce((s, l) => s + l.qty_remaining * l.unit_cost, 0);
  const cash = myTeam ? Number(myTeam.cash) : data.session!.starting_cash;

  return (
    <div className="space-y-5">
      {round?.status === "open" && (
        <Callout tone="warn">
          La semana está <b>abierta</b>. Ve a <b>Pedido</b> para decidir tus compras.{" "}
          <button onClick={onGoPedido} className="font-semibold underline">Ir al pedido →</button>
        </Callout>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat tone="profit" label="Caja" value={money(cash)} />
        <Stat tone="brand" label="Estante (a costo)" value={money(invValue)} />
        <Stat
          tone={last && last.profit_round >= 0 ? "profit" : "loss"}
          label="Ganancia última sem."
          value={last ? money(last.profit_round) : "—"}
        />
        <Stat
          tone="info"
          label="Servicio prom."
          value={last ? percent(last.avg_service_level) : "—"}
        />
      </div>

      {last && (
        <Card title={`Resultado de la semana ${last.round_number}`}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat tone="info" label="Demanda" value={int(last.demand_total)} />
            <Stat tone="neutral" label="Vendidas" value={int(last.units_sold)} />
            <Stat tone="loss" label="No atendidas" value={int(last.lost_sales)} />
            <Stat tone="warn" label="Merma" value={money(last.spoilage_cost)} />
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Nivel de servicio de la semana: <b>{percent(last.service_level)}</b>. Caja
            al cierre: <b>{money(last.cash_end)}</b>
            {last.debt > 0 && <> · Deuda: <b className="text-danger-700">{money(last.debt)}</b></>}.
          </p>
        </Card>
      )}
    </div>
  );
}

// ------------------------------------------------------------------- Tienda
function TiendaTab({ data, identity }: { data: GameData; identity: TeamIdentity }) {
  const stock = inventoryByProduct(data.lots, data.products, identity.teamId);
  const currentRoundNo = data.session!.current_round;
  return (
    <Card title="Tu estante">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm tabular">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
              <th className="py-2 pr-2">Producto</th>
              <th className="px-2 text-right">En estante</th>
              <th className="px-2 text-right">Valor (costo)</th>
              <th className="px-2">Vence</th>
            </tr>
          </thead>
          <tbody>
            {stock.map(({ product, qty, value, lots }) => {
              const soon = lots.some(
                (l) => l.expires_after_round != null && l.expires_after_round <= currentRoundNo,
              );
              return (
                <tr key={product.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2 font-medium text-slate-800">
                    {product.name}
                    {product.active_from_round > currentRoundNo && (
                      <span className="ml-1 text-xs text-slate-400">(entra sem. {product.active_from_round})</span>
                    )}
                  </td>
                  <td className="px-2 text-right font-semibold">{int(qty)} {product.unit_label}</td>
                  <td className="px-2 text-right">{money(value)}</td>
                  <td className="px-2">
                    {lots.some((l) => l.expires_after_round != null) ? (
                      <span className={cx("text-xs", soon ? "font-semibold text-danger-700" : "text-slate-500")}>
                        {soon ? "¡esta semana!" : "perecedero"}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">no vence</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------- Pedido
function PedidoTab({
  code,
  identity,
  data,
  round,
  teamState,
  onSubmitted,
}: {
  code: string;
  identity: TeamIdentity;
  data: GameData;
  round: RoundRow | null;
  teamState: TeamState | null;
  onSubmitted: () => void;
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  // inicializar carrito desde los pedidos ya enviados
  useEffect(() => {
    if (teamState) {
      const init: Record<string, number> = {};
      for (const o of teamState.myOrders) init[o.offer_id] = o.qty;
      setCart(init);
    }
  }, [teamState]);

  if (!round || round.status !== "open") {
    return (
      <Callout tone="info">
        No hay una semana abierta para pedir. Espera a que el facilitador abra la semana.
      </Callout>
    );
  }

  const supply = (round.supply_config as SupplyConfig | null) ?? {
    luchoCap: 999999,
    principalAvailable: true,
    deliveryFactor: 1,
  };
  const roundNo = round.round_number;
  const supById = byId(data.suppliers);
  // caja base = caja del equipo (availableCash ya descuenta pedidos previos; los sumamos de vuelta)
  const baseCash = teamState
    ? teamState.availableCash + teamState.myOrders.reduce((s, o) => s + Number(o.total_cost), 0)
    : Number(data.teams.find((t) => t.id === identity.teamId)?.cash ?? data.session!.starting_cash);

  const offerById = byId(data.offers);
  const total = Object.entries(cart).reduce((s, [offerId, qty]) => {
    const o = offerById.get(offerId);
    return s + (o ? qty * o.unit_cost : 0);
  }, 0);
  const remaining = baseCash - total;
  const overBudget = remaining < -1e-6;

  const activeProducts = data.products.filter((p) => p.active_from_round <= roundNo);

  function setQty(offerId: string, qty: number, pack: number, max: number) {
    const clamped = Math.max(0, Math.min(max, Math.round(qty / pack) * pack));
    setCart((c) => ({ ...c, [offerId]: clamped }));
  }

  async function submit() {
    setSaving(true);
    setMsg(null);
    try {
      const orders = Object.entries(cart)
        .filter(([, q]) => q > 0)
        .map(([offerId, qty]) => ({ offerId, qty }));
      const res = await fetch("/api/v2/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, teamId: identity.teamId, token: identity.token, roundId: round!.id, orders }),
      });
      const j = await res.json();
      if (!res.ok) setMsg({ tone: "error", text: j.error ?? "No se pudo enviar el pedido." });
      else {
        setMsg({ tone: "success", text: `Pedido guardado (${j.lines} líneas, ${money(j.totalCost)}). Puedes cambiarlo hasta que cierren la semana.` });
        onSubmitted();
      }
    } catch {
      setMsg({ tone: "error", text: "Error de red al enviar." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-16 z-10 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <div className="text-xs uppercase text-slate-400">Caja disponible</div>
          <div className={cx("tabular text-xl font-bold", overBudget ? "text-danger-700" : "text-brand-700")}>
            {money(remaining)}
          </div>
        </div>
        <Button onClick={submit} disabled={saving || overBudget} size="lg">
          {saving ? <Spinner /> : "Guardar pedido"}
        </Button>
      </div>

      {msg && <Callout tone={msg.tone}>{msg.text}</Callout>}

      {activeProducts.map((product) => {
        const offers = data.offers
          .filter((o) => o.product_id === product.id)
          .sort((a, b) => a.lead_time_rounds - b.lead_time_rounds);
        return (
          <Card key={product.id} title={product.name}>
            <div className="space-y-3">
              {offers.map((offer) => {
                const sup = supById.get(offer.supplier_id);
                const express = sup?.is_express;
                const available = express ? true : supply.principalAvailable;
                const max = express ? supply.luchoCap : 5000;
                const qty = cart[offer.id] ?? 0;
                return (
                  <div
                    key={offer.id}
                    className={cx(
                      "flex flex-wrap items-center justify-between gap-3 rounded-md border p-3",
                      available ? "border-slate-200" : "border-slate-100 bg-slate-50 opacity-60",
                    )}
                  >
                    <div className="min-w-[9rem]">
                      <div className="text-sm font-semibold text-slate-800">{sup?.name}</div>
                      <div className="text-xs text-slate-500">
                        {money(offer.unit_cost)}/u · caja de {offer.pack_size} ·{" "}
                        {offer.lead_time_rounds === 0 ? "llega hoy" : "llega la próxima semana"}
                      </div>
                      {!available && <div className="text-xs text-slate-400">no atiende esta semana</div>}
                      {express && <div className="text-xs text-slate-400">tope {supply.luchoCap}/producto</div>}
                    </div>
                    <div className="flex items-center gap-1">
                      <StepBtn onClick={() => setQty(offer.id, qty - offer.pack_size, offer.pack_size, max)} disabled={!available || qty <= 0}>−</StepBtn>
                      <input
                        value={qty}
                        onChange={(e) => setQty(offer.id, Number(e.target.value) || 0, offer.pack_size, max)}
                        inputMode="numeric"
                        disabled={!available}
                        className="tabular w-16 rounded-md border border-slate-300 py-1.5 text-center font-semibold disabled:bg-slate-100"
                      />
                      <StepBtn onClick={() => setQty(offer.id, qty + offer.pack_size, offer.pack_size, max)} disabled={!available}>+</StepBtn>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function StepBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-9 w-9 rounded-md border border-slate-300 bg-white text-lg font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

// -------------------------------------------------------------------- Podio
function PodioTab({
  ranking,
  meId,
  finished,
}: {
  ranking: ReturnType<typeof rankTeams>;
  meId: string;
  finished: boolean;
}) {
  return (
    <div className="space-y-4">
      {finished && ranking[0] && (
        <div className="rounded-lg border border-gold-200 bg-gold-50 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gold-700">
            Resultado final
          </div>
          <div className="mt-1 text-sm text-slate-700">
            Mejores Analistas del Barrio: <b className="text-slate-900">{ranking[0].name}</b>
          </div>
          <div className="tabular mt-0.5 text-xl font-bold text-gold-700">{money(ranking[0].score_total)}</div>
        </div>
      )}
      <Card title="Podio · Valor de la Tienda">
        {ranking.length === 0 ? (
          <p className="text-sm text-slate-400">Aún no hay resultados.</p>
        ) : (
          <ol className="divide-y divide-slate-100">
            {ranking.map((t) => {
              const isMe = t.id === meId;
              return (
                <li key={t.id} className={cx("flex items-center gap-3 px-1 py-2", isMe && "-mx-1 rounded-md bg-brand-50 px-2")}>
                  <span
                    className={cx(
                      "tabular flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold",
                      t.rank === 1 ? "bg-gold-100 text-gold-700" : t.rank <= 3 ? "bg-slate-100 text-slate-600" : "text-slate-400",
                    )}
                  >
                    {t.rank}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium text-slate-800">
                    {t.name}
                    {isMe && <span className="ml-1 text-xs font-normal text-brand-600">(tú)</span>}
                  </span>
                  <span className="tabular text-right text-sm font-bold text-slate-900">{money(t.score_total)}</span>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
