"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Callout,
  Card,
  Field,
  Input,
  PageShell,
  Spinner,
} from "@/components/ui";
import { saveFacilitatorCreds } from "@/lib/facilitator";
import {
  DEFAULT_DEMANDS,
  DEFAULT_HISTORY,
  DEFAULT_PARAMS,
  DEFAULT_TOTAL_ROUNDS,
  PRODUCT_OPTIONS,
} from "@/lib/constants";

function parseInts(text: string): number[] {
  return text
    .split(/[,\s]+/)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n >= 0);
}

export default function FacilitatorCreatePage() {
  const router = useRouter();
  const [name, setName] = useState("Stock Perfecto — Feria");
  const [product, setProduct] = useState(PRODUCT_OPTIONS[0]);
  const [pin, setPin] = useState("");
  const [totalRounds, setTotalRounds] = useState(String(DEFAULT_TOTAL_ROUNDS));
  const [price, setPrice] = useState(String(DEFAULT_PARAMS.price));
  const [cost, setCost] = useState(String(DEFAULT_PARAMS.cost));
  const [salvage, setSalvage] = useState(String(DEFAULT_PARAMS.salvage));
  const [demands, setDemands] = useState(DEFAULT_DEMANDS.join(", "));
  const [history, setHistory] = useState(DEFAULT_HISTORY.join(", "));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ code: string; pin: string } | null>(
    null,
  );
  const [existingCode, setExistingCode] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          productLabel: product,
          pin,
          totalRounds: parseInt(totalRounds, 10) || DEFAULT_TOTAL_ROUNDS,
          params: {
            price: parseFloat(price),
            cost: parseFloat(cost),
            salvage: parseFloat(salvage),
          },
          demands: parseInts(demands),
          history: parseInts(history),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo crear la sala.");
      } else {
        saveFacilitatorCreds({ code: json.code, pin: json.pin });
        setCreated({ code: json.code, pin: json.pin });
      }
    } catch {
      setError("Error de red al crear la sala.");
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    const joinUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/join?code=${created.code}`
        : "";
    return (
      <PageShell title="¡Sala creada!" subtitle="Comparte el código con tus estudiantes.">
        <div className="mx-auto max-w-lg space-y-4">
          <Card>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-xs uppercase text-slate-400">Código de sala</div>
                <div className="mt-1 font-mono text-4xl font-black tracking-widest text-brand-700">
                  {created.code}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-400">PIN de facilitador</div>
                <div className="mt-1 font-mono text-4xl font-black tracking-widest text-slate-800">
                  {created.pin}
                </div>
              </div>
            </div>
            <p className="mt-4 break-all rounded-lg bg-slate-50 px-3 py-2 text-center text-sm text-slate-500">
              Enlace directo: {joinUrl}
            </p>
            <Callout tone="warn">
              Anota el <strong>PIN</strong>: lo necesitas para controlar las rondas.
            </Callout>
          </Card>
          <Button
            size="lg"
            className="w-full"
            onClick={() => router.push(`/facilitator/${created.code}`)}
          >
            Ir al panel de control →
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Crear sala"
      subtitle="Configura la simulación. Podrás editar las demandas por ronda antes de abrir cada una."
      right={
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← Inicio
        </Link>
      }
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <form onSubmit={handleCreate} className="space-y-5 lg:col-span-2">
          <Card title="Datos de la sala">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre de la actividad">
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
              </Field>
              <Field label="Producto del kiosco">
                <select
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                >
                  {PRODUCT_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="PIN de facilitador" hint="Déjalo vacío para generarlo automáticamente.">
                <Input
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Automático"
                  inputMode="numeric"
                />
              </Field>
              <Field label="Número de rondas">
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={totalRounds}
                  onChange={(e) => setTotalRounds(e.target.value)}
                />
              </Field>
            </div>
          </Card>

          <Card title="Parámetros económicos (Bs)">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Precio de venta">
                <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
              </Field>
              <Field label="Costo unitario">
                <Input type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} />
              </Field>
              <Field label="Recup. si sobra">
                <Input type="number" min={0} value={salvage} onChange={(e) => setSalvage(e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card title="Demanda (secreta)">
            <div className="space-y-4">
              <Field
                label="Demanda real por ronda"
                hint="Separadas por coma. Solo tú la ves; se revela ronda por ronda."
              >
                <Input value={demands} onChange={(e) => setDemands(e.target.value)} />
              </Field>
              <Field
                label="Demanda histórica (rondas 3 y 4)"
                hint="Serie de días previos que verán los estudiantes como pista."
              >
                <Input value={history} onChange={(e) => setHistory(e.target.value)} />
              </Field>
            </div>
          </Card>

          {error && <Callout tone="error">{error}</Callout>}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? <Spinner /> : "Crear sala"}
          </Button>
        </form>

        <div className="space-y-5">
          <Card title="¿Ya tienes una sala?">
            <p className="mb-3 text-sm text-slate-500">
              Entra a tu panel con el código (te pedirá el PIN).
            </p>
            <div className="flex gap-2">
              <Input
                value={existingCode}
                onChange={(e) => setExistingCode(e.target.value.toUpperCase())}
                placeholder="Código"
                className="text-center font-bold tracking-widest"
              />
              <Button
                variant="secondary"
                onClick={() =>
                  existingCode && router.push(`/facilitator/${existingCode.trim()}`)
                }
              >
                Ir
              </Button>
            </div>
          </Card>
          <Card title="Cómo funciona">
            <ol className="list-decimal space-y-1 pl-4 text-sm text-slate-600">
              <li>Comparte el código con los estudiantes.</li>
              <li>Abre la ronda para recibir decisiones.</li>
              <li>Cierra cuando todos hayan enviado.</li>
              <li>Revela la demanda: se calculan los resultados.</li>
              <li>Avanza a la siguiente ronda.</li>
            </ol>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
