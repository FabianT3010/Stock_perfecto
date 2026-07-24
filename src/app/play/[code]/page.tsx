"use client";

import {
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
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
import { teamStorageKey, type TeamIdentity } from "@/lib/v2/team";
import { money, int, percent } from "@/lib/format";
import type { RoundRow, SupplyConfig } from "@/lib/v2/types";

// Los gráficos se cargan dentro de Inventario y compras sin bloquear el ingreso.
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

const ROUND_QUESTIONS: Record<number, string> = {
  1: "Según el cuaderno, ¿cuánto se vende normalmente y qué rango ves?",
  2: "¿Qué necesitas hoy y qué debe llegar la próxima semana para la kermesse?",
  3: "¿Qué productos pueden quebrarse aunque uses el rescate caro de Don Lucho?",
  4: "Con medio camión, ¿qué colchón te protege sin inmovilizar demasiada caja?",
  5: "¿Qué conviene vender y qué stock no quieres dejarle a Doña Peta?",
};

function TeamGame({ code }: { code: string }) {
  const storedIdentity = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      return () => window.removeEventListener("storage", onChange);
    },
    () => window.localStorage.getItem(teamStorageKey(code)),
    () => null,
  );
  const identity = useMemo(() => {
    if (!storedIdentity) return null;
    try {
      return JSON.parse(storedIdentity) as TeamIdentity;
    } catch {
      return null;
    }
  }, [storedIdentity]);
  const data = useGameData(code);

  if (data.loading) {
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

type Tab = "inicio" | "operacion" | "podio";

type TeamState = {
  availableCash: number;
  myOrders: { offer_id: string; product_id: string; qty: number; total_cost: number }[];
  pendingOrders: {
    id: string;
    supplier_id: string;
    product_id: string;
    qty: number;
    placed_round: number;
    arrives_round: number;
    total_cost: number;
  }[];
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
        setTeamState({
          availableCash: j.availableCash,
          myOrders: j.myOrders ?? [],
          pendingOrders: j.pendingOrders ?? [],
          openRound: j.openRound,
        });
      }
    } catch {
      /* la robustez del hook cubre lo público; esto es best-effort */
    }
  }, [code, identity.teamId, identity.token]);

  useEffect(() => {
    queueMicrotask(refreshTeamState);
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

      {session!.status === "lobby" && <OnboardingBrief />}

      {/* pestañas */}
      <nav className="mb-5 flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        {(["inicio", "operacion", "podio"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx(
              "flex-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold capitalize transition",
              tab === t ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50",
              t === "operacion" && isOpen && tab !== t && "text-brand-700",
            )}
          >
            {t === "inicio" ? "Resumen" : t === "operacion" ? "Inventario y compras" : "Clasificación"}
            {t === "operacion" && isOpen && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-accent-500 align-middle" />}
          </button>
        ))}
      </nav>

      {tab === "inicio" && <InicioTab data={data} identity={identity} last={last} round={round} onGoPedido={() => setTab("operacion")} />}
      {tab === "operacion" && (
        isOpen && teamState?.openRound?.id !== round?.id
          ? <div className="flex h-40 items-center justify-center"><Spinner className="h-6 w-6 text-slate-400" /></div>
          : (
            <OperacionTab
              key={round?.id ?? "no-round"}
              code={code}
              identity={identity}
              data={data}
              round={round}
              teamState={teamState}
              onSubmitted={refreshTeamState}
            />
          )
      )}
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
  const remaining = useCountdown(round?.status === "open" ? round.closes_at : null);
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
        <div className="text-right">
          <Badge tone={round.status}>{STATUS_LABEL[round.status]}</Badge>
          {round.status === "open" && (
            <div className="mt-1 font-mono text-xl font-black tabular-nums text-brand-800">
              {formatCountdown(remaining)}
            </div>
          )}
        </div>
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

function OnboardingBrief() {
  return (
    <div className="mb-5">
      <Card title="R0 · Conoce la tienda antes de decidir">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            <b>1. Misión</b><br />Cuiden durante cinco semanas la tienda de Doña Peta.
          </div>
          <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            <b>2. Decisión</b><br />Elijan qué comprar, cuánto y a cuál proveedor.
          </div>
          <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            <b>3. Regla</b><br />La caja, el inventario y la deuda viajan entre semanas.
          </div>
        </div>
        <div className="mt-3">
          <Callout tone="info">
            Micro-reto: abre <b>Inventario y compras</b>, revisa el historial del
            refresco y estima su promedio antes de la semana 1.
          </Callout>
        </div>
      </Card>
    </div>
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
          La semana está <b>abierta</b>. Ve a <b>Inventario y compras</b> para decidir.{" "}
          <button onClick={onGoPedido} className="font-semibold underline">Ir a comprar →</button>
        </Callout>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat tone="profit" label="Caja" value={money(cash)} />
        <Stat tone="brand" label="Inventario valorizado al costo" value={money(invValue)} />
        <Stat
          tone={last && last.profit_round >= 0 ? "profit" : "loss"}
          label="Ganancia de la última semana"
          value={last ? money(last.profit_round) : "—"}
        />
        <Stat
          tone="info"
          label="Clientes atendidos (promedio)"
          value={last ? percent(last.avg_service_level) : "—"}
        />
      </div>

      {last && (
        <Card title={`Resultado de la semana ${last.round_number}`}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat tone="info" label="Unidades solicitadas" value={int(last.demand_total)} />
            <Stat tone="neutral" label="Unidades vendidas" value={int(last.units_sold)} />
            <Stat tone="loss" label="Ventas perdidas" value={int(last.lost_sales)} />
            <Stat tone="warn" label="Pérdida por vencimiento" value={money(last.spoilage_cost)} />
          </div>
          <ProductResultComparison
            data={data}
            teamId={identity.teamId}
            roundNumber={last.round_number}
          />
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

function ProductResultComparison({
  data,
  teamId,
  roundNumber,
}: {
  data: GameData;
  teamId: string;
  roundNumber: number;
}) {
  const productById = byId(data.products);
  const supplierById = byId(data.suppliers);
  const rows = data.productResults
    .filter((row) => row.team_id === teamId && row.round_number === roundNumber)
    .filter((row) => row.demand_units > 0)
    .sort(
      (a, b) =>
        (productById.get(a.product_id)?.sort_order ?? 0) -
        (productById.get(b.product_id)?.sort_order ?? 0),
    );
  if (!rows.length) return null;
  const lostRevenue = rows.reduce((sum, row) => sum + Number(row.lost_revenue), 0);
  return (
    <div className="mt-4">
      <div className="mb-2 text-sm font-semibold text-slate-700">
        Comparación por producto
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm tabular">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
              <th className="py-2 pr-2">Producto</th>
              <th className="px-2 text-right">Precio de venta</th>
              <th className="px-2 text-right">Costo La Principal</th>
              <th className="px-2 text-right">Costo Don Lucho</th>
              <th className="px-2 text-right">Demanda real</th>
              <th className="px-2 text-right">Vendido</th>
              <th className="px-2 text-right">Ingreso por ventas</th>
              <th className="px-2 text-right">Venta perdida</th>
              <th className="px-2 text-right">Dinero no ingresado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const product = productById.get(row.product_id);
              const productOffers = data.offers.filter((offer) => offer.product_id === row.product_id);
              const principalCost = productOffers.find(
                (offer) => supplierById.get(offer.supplier_id)?.code === "PRINCIPAL",
              )?.unit_cost;
              const luchoCost = productOffers.find(
                (offer) => supplierById.get(offer.supplier_id)?.code === "LUCHO",
              )?.unit_cost;
              return (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2 font-medium text-slate-800">{product?.name}</td>
                  <td className="px-2 text-right">{money(Number(product?.sale_price ?? 0))}</td>
                  <td className="px-2 text-right">{principalCost == null ? "—" : money(Number(principalCost))}</td>
                  <td className="px-2 text-right">{luchoCost == null ? "—" : money(Number(luchoCost))}</td>
                  <td className="px-2 text-right font-semibold">{int(row.demand_units)} u</td>
                  <td className="px-2 text-right text-brand-700">{int(row.sold_units)} u</td>
                  <td className="px-2 text-right text-brand-700">{money(Number(row.sales_revenue))}</td>
                  <td className="px-2 text-right text-danger-700">{int(row.lost_units)} u</td>
                  <td className="px-2 text-right font-semibold text-danger-700">{money(Number(row.lost_revenue))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Callout tone={lostRevenue > 0 ? "warn" : "success"}>
        {lostRevenue > 0
          ? <>Las ventas perdidas representan <b>{money(lostRevenue)}</b> que no ingresaron a caja.</>
          : "Atendieron toda la demanda de esta semana."}
      </Callout>
    </div>
  );
}

// -------------------------------------------------------- Inventario y compras
function OperacionTab({
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
  const draftKey = `sp:v2:cart:${code}:${identity.teamId}:${round?.id ?? "none"}`;
  const [cart, setCart] = useState<Record<string, number>>(() => {
    const sent: Record<string, number> = {};
    for (const order of teamState?.myOrders ?? []) sent[order.offer_id] = order.qty;
    if (Object.keys(sent).length > 0) return sent;
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(draftKey);
      return raw ? (JSON.parse(raw) as Record<string, number>) : {};
    } catch {
      return {};
    }
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const isOpen = round?.status === "open";
  const roundNo = round?.round_number ?? Math.max(1, data.session!.current_round);
  const supply = (round?.supply_config as SupplyConfig | null) ?? {
    luchoCap: 999999,
    principalAvailable: true,
    deliveryFactor: 1,
  };
  const supById = byId(data.suppliers);
  const inventory = inventoryByProduct(data.lots, data.products, identity.teamId);
  const inventoryById = new Map(inventory.map((row) => [row.product.id, row]));
  const products = [...data.products].sort((a, b) => a.sort_order - b.sort_order);
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

  function setQty(offerId: string, qty: number, pack: number, max: number) {
    const clamped = Math.max(0, Math.min(max, Math.round(qty / pack) * pack));
    setCart((current) => {
      const next = { ...current, [offerId]: clamped };
      localStorage.setItem(draftKey, JSON.stringify(next));
      return next;
    });
  }

  async function submit() {
    if (!round || !isOpen) return;
    setSaving(true);
    setMsg(null);
    try {
      const orders = Object.entries(cart)
        .filter(([, q]) => q > 0)
        .map(([offerId, qty]) => ({ offerId, qty }));
      const res = await fetch("/api/v2/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, teamId: identity.teamId, token: identity.token, roundId: round.id, orders }),
      });
      const j = await res.json();
      if (!res.ok) setMsg({ tone: "error", text: j.error ?? "No se pudo enviar el pedido." });
      else {
        setMsg({ tone: "success", text: `Pedido guardado (${j.lines} líneas, ${money(j.totalCost)}). Puedes cambiarlo hasta que cierren la semana.` });
        onSubmitted();
      }
    } catch {
      setMsg({ tone: "error", text: "Sin señal: el borrador sigue guardado en este celular. Reconecta y vuelve a tocar Guardar pedido." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {isOpen ? (
        <>
          <Callout tone="info">
            <b>Pregunta guía:</b> {ROUND_QUESTIONS[roundNo]}
          </Callout>
          <div className="sticky top-16 z-10 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div>
              <div className="text-xs uppercase text-slate-500">Caja después de este pedido</div>
              <div className={cx("tabular text-xl font-bold", overBudget ? "text-danger-700" : "text-brand-700")}>
                {money(remaining)}
              </div>
            </div>
            <Button onClick={submit} disabled={saving || overBudget} size="lg">
              {saving ? <Spinner /> : "Guardar pedido"}
            </Button>
          </div>
        </>
      ) : (
        <Callout tone="info">
          Puedes revisar inventario, precios, costos e historial. Las cantidades
          de compra se habilitan cuando el facilitador abra una semana.
        </Callout>
      )}

      {msg && <Callout tone={msg.tone}>{msg.text}</Callout>}

      {products.map((product) => {
        const stock = inventoryById.get(product.id);
        const offers = data.offers
          .filter((o) => o.product_id === product.id)
          .sort((a, b) => a.lead_time_rounds - b.lead_time_rounds);
        const historical = data.history
          .filter((row) => row.product_id === product.id)
          .sort((a, b) => a.week_number - b.week_number);
        const pending = (teamState?.pendingOrders ?? []).filter(
          (order) => order.product_id === product.id && order.arrives_round >= roundNo,
        );
        const expiringNow = stock?.lots.some(
          (lot) =>
            lot.expires_after_round != null &&
            lot.expires_after_round <= data.session!.current_round,
        );
        const active = product.active_from_round <= roundNo;
        return (
          <Card
            key={product.id}
            title={product.name}
            aside={
              <div className="text-right">
                <div className="text-[10px] uppercase text-slate-500">Precio de venta</div>
                <div className="font-bold text-brand-700">{money(Number(product.sale_price))}/u</div>
              </div>
            }
          >
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat tone="brand" label="Inventario disponible" value={`${int(stock?.qty ?? 0)} ${product.unit_label}`} />
                <Stat tone="neutral" label="Valor del inventario al costo" value={money(stock?.value ?? 0)} />
                <Stat
                  tone={expiringNow ? "loss" : "info"}
                  label="Vencimiento"
                  value={
                    expiringNow
                      ? "Vence esta semana"
                      : stock?.lots.some((lot) => lot.expires_after_round != null)
                        ? "Producto perecedero"
                        : "No vence"
                  }
                />
                <Stat
                  tone={active ? "profit" : "neutral"}
                  label="Disponible en el juego"
                  value={active ? `Desde semana ${product.active_from_round}` : `Se habilita en semana ${product.active_from_round}`}
                />
              </div>

              {pending.length > 0 && (
                <Callout tone="info">
                  <b>Pedido en camino:</b>{" "}
                  {pending.map((order, index) => (
                    <span key={order.id}>
                      {index > 0 && " · "}
                      {int(order.qty)} u pedidas en S{order.placed_round}; llegan al
                      inicio de S{order.arrives_round}, antes de vender.
                    </span>
                  ))}
                </Callout>
              )}

              <details className="rounded-md border border-slate-200 bg-slate-50">
                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-slate-700">
                  Historial de ventas y ventas perdidas ({historical.length} semanas)
                </summary>
                <div className="overflow-x-auto border-t border-slate-200 bg-white p-2">
                  <table className="w-full min-w-[520px] text-xs tabular">
                    <thead>
                      <tr className="text-left uppercase text-slate-500">
                        <th className="px-2 py-1">Semana histórica</th>
                        <th className="px-2 py-1 text-right">Vendido</th>
                        <th className="px-2 py-1 text-right">Venta perdida</th>
                        <th className="px-2 py-1 text-right">Dinero no ingresado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historical.map((history) => (
                        <tr key={history.id} className="border-t border-slate-100">
                          <td className="px-2 py-1">{history.week_number}</td>
                          <td className="px-2 py-1 text-right">{int(history.units_sold)} u</td>
                          <td className="px-2 py-1 text-right">{int(history.lost_sales)} u</td>
                          <td className="px-2 py-1 text-right">{money(history.lost_sales * Number(product.sale_price))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>

              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Costos de compra y tiempo de llegada
              </div>
              {offers.map((offer) => {
                const sup = supById.get(offer.supplier_id);
                const express = sup?.is_express;
                const supplierAvailable = express ? true : supply.principalAvailable;
                const available = Boolean(isOpen && active && supplierAvailable);
                const max = express ? supply.luchoCap : 5000;
                const qty = cart[offer.id] ?? 0;
                const arrivalRound = roundNo + offer.lead_time_rounds;
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
                      <div className="text-xs text-slate-600">
                        Costo: <b>{money(offer.unit_cost)}/u</b> · compra en múltiplos de {offer.pack_size}
                      </div>
                      <div className="mt-0.5 text-xs font-medium text-brand-700">
                        {offer.lead_time_rounds === 0
                          ? `Si compras en S${roundNo}, llega antes de las ventas de S${roundNo}.`
                          : `Si compras en S${roundNo}, llega al inicio de S${arrivalRound}, antes de vender.`}
                      </div>
                      {!supplierAvailable && <div className="text-xs text-slate-400">El proveedor no recibe pedidos esta semana.</div>}
                      {!active && <div className="text-xs text-slate-400">Producto habilitado desde S{product.active_from_round}.</div>}
                      {express && <div className="text-xs text-slate-400">Máximo {supply.luchoCap} u por producto.</div>}
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
      <DataTab data={data} teamId={identity.teamId} />
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
      <Card title="Clasificación · Valor de la Tienda">
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
