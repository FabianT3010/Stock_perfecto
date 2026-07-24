"use client";

// Panel de datos integrado a Inventario y compras. Se carga de forma diferida
// para que los gráficos no bloqueen el flujo crítico de ingreso.
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, cx } from "@/components/ui";
import type { GameData } from "@/lib/v2/useGameData";
import {
  SERIES_PALETTE,
  lostByWeek,
  moneyByWeek,
  productColors,
  salesByProduct,
  serviceByWeek,
  type ChartRow,
} from "@/lib/v2/charts";

type Preset = "ventas" | "plata" | "servicio" | "perdidas";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "ventas", label: "¿Cuánto se vende?" },
  { key: "plata", label: "¿Dónde está mi plata?" },
  { key: "servicio", label: "¿Estoy pidiendo bien?" },
  { key: "perdidas", label: "¿Cuántas ventas perdí?" },
];

const AXIS = { fontSize: 12, fill: "#64748b" };
const GRID = "#e2e8f0";

export default function DataTab({ data, teamId }: { data: GameData; teamId: string }) {
  const [preset, setPreset] = useState<Preset>("ventas");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showTable, setShowTable] = useState(false);

  const colors = useMemo(() => productColors(data.products), [data.products]);

  const salesRows = useMemo(
    () => salesByProduct(data.history, data.moves, data.kpis, data.products, teamId),
    [data.history, data.moves, data.kpis, data.products, teamId],
  );
  const moneyRows = useMemo(() => moneyByWeek(data.kpis, teamId), [data.kpis, teamId]);
  const serviceRows = useMemo(() => serviceByWeek(data.kpis, teamId), [data.kpis, teamId]);
  const lostRows = useMemo(
    () => lostByWeek(data.history, data.productResults, data.products, teamId),
    [data.history, data.productResults, data.products, teamId],
  );

  // productos con algún dato en ventas
  const salesProducts = data.products
    .filter((p) => salesRows.some((r) => (r[p.name] ?? 0) > 0))
    .sort((a, b) => a.sort_order - b.sort_order);

  const weekTick = (w: number) => (w < 0 ? `${w}` : `S${w}`);

  function render() {
    if (preset === "ventas") {
      if (!salesRows.length) return <Empty />;
      const visible = salesProducts.filter((p) => !hidden.has(p.id));
      return (
        <>
          <ChipRow>
            {salesProducts.map((p) => {
              const on = !hidden.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() =>
                    setHidden((h) => {
                      const n = new Set(h);
                      if (n.has(p.id)) n.delete(p.id);
                      else n.add(p.id);
                      return n;
                    })
                  }
                  className={cx(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                    on ? "border-slate-300 bg-white text-slate-700" : "border-slate-200 bg-slate-50 text-slate-400",
                  )}
                >
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: on ? colors.get(p.id) : "#cbd5e1" }} />
                  {p.name}
                </button>
              );
            })}
          </ChipRow>
          <ChartFrame>
            <LineChart data={salesRows} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis type="number" dataKey="week" domain={["dataMin", "dataMax"]} ticks={salesRows.map((r) => r.week)} tickFormatter={weekTick} tick={AXIS} />
              <YAxis tick={AXIS} width={40} />
              <Tooltip labelFormatter={(w) => (Number(w) < 0 ? `Semana ${w} (historia)` : `Semana ${w}`)} />
              <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: "hoy", position: "top", fontSize: 11, fill: "#64748b" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {visible.map((p) => (
                <Line key={p.id} type="monotone" dataKey={p.name} stroke={colors.get(p.id)} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} connectNulls />
              ))}
            </LineChart>
          </ChartFrame>
          {showTable && <DataTable rows={salesRows} cols={["week", ...visible.map((p) => p.name)]} weekTick={weekTick} />}
        </>
      );
    }
    if (preset === "plata") {
      if (!moneyRows.length) return <Empty />;
      return (
        <>
          <ChartFrame>
            <LineChart data={moneyRows} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="week" tickFormatter={(w) => `S${w}`} tick={AXIS} />
              <YAxis tick={AXIS} width={48} />
              <Tooltip labelFormatter={(w) => `Semana ${w}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Caja" stroke={SERIES_PALETTE[0]} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="Valor de la Tienda" stroke={SERIES_PALETTE[2]} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ChartFrame>
          {showTable && <DataTable rows={moneyRows} cols={["week", "Caja", "Valor de la Tienda"]} weekTick={(w) => `S${w}`} />}
        </>
      );
    }
    if (preset === "servicio") {
      if (!serviceRows.length) return <Empty />;
      return (
        <>
          <ChartFrame>
            <LineChart data={serviceRows} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="week" tickFormatter={(w) => `S${w}`} tick={AXIS} />
              <YAxis domain={[0, 100]} tick={AXIS} width={40} />
              <Tooltip labelFormatter={(w) => `Semana ${w}`} />
              <Line type="monotone" dataKey="Clientes atendidos (%)" stroke={SERIES_PALETTE[1]} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ChartFrame>
          {showTable && <DataTable rows={serviceRows} cols={["week", "Clientes atendidos (%)"]} weekTick={(w) => `S${w}`} />}
        </>
      );
    }
    // perdidas
    if (!lostRows.length) return <Empty />;
    return (
      <>
        <ChartFrame>
          <BarChart data={lostRows} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="week" tickFormatter={weekTick} tick={AXIS} />
            <YAxis tick={AXIS} width={40} />
            <Tooltip labelFormatter={(w) => (Number(w) < 0 ? `Semana ${w} (historia)` : `Semana ${w}`)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="4 4" />
            <Bar dataKey="Ventas perdidas (u)" fill={SERIES_PALETTE[5]} radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="Ventas perdidas (Bs)" fill={SERIES_PALETTE[2]} radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ChartFrame>
        {showTable && <DataTable rows={lostRows} cols={["week", "Ventas perdidas (u)", "Ventas perdidas (Bs)"]} weekTick={weekTick} />}
      </>
    );
  }

  return (
    <Card
      title="Datos históricos y resultados"
      aside={
        <button onClick={() => setShowTable((v) => !v)} className="text-xs font-semibold text-brand-700 hover:underline">
          {showTable ? "Ocultar tabla" : "Ver tabla"}
        </button>
      }
    >
      <ChipRow>
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={cx(
              "rounded-full border px-3 py-1.5 text-xs font-semibold",
              preset === p.key ? "border-brand-600 bg-brand-700 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            {p.label}
          </button>
        ))}
      </ChipRow>
      <div className="mt-4">{render()}</div>
    </Card>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function ChartFrame({ children }: { children: React.ReactElement }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-slate-400">
      Aún no hay datos suficientes. Aparecerán cuando avancen las semanas.
    </div>
  );
}

function DataTable({
  rows,
  cols,
  weekTick,
}: {
  rows: ChartRow[];
  cols: string[];
  weekTick: (w: number) => string;
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[400px] text-sm tabular">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
            {cols.map((c) => (
              <th key={c} className="px-2 py-1.5">{c === "week" ? "Semana" : c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-100">
              {cols.map((c) => (
                <td key={c} className="px-2 py-1">{c === "week" ? weekTick(r.week) : (r[c] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
