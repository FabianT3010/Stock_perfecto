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

export default function FacilitatorCreatePage() {
  const router = useRouter();
  const [name, setName] = useState("La Tiendita de Doña Peta");
  const [pin, setPin] = useState("");
  const [rounds, setRounds] = useState("5");
  const [maxTeams, setMaxTeams] = useState("20");
  const [roundMinutes, setRoundMinutes] = useState("6");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ code: string; pin: string; maxTeams: number } | null>(null);
  const [existingCode, setExistingCode] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v2/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          pin: pin.trim() || undefined,
          totalRounds: parseInt(rounds, 10) || 5,
          maxTeams: parseInt(maxTeams, 10) || 20,
          roundDurationMinutes: parseFloat(roundMinutes) || 6,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo crear la sala.");
      } else {
        saveFacilitatorCreds({ code: json.code, pin: json.pin });
        setCreated({ code: json.code, pin: json.pin, maxTeams: json.session.max_teams });
      }
    } catch {
      setError("Error de red al crear la sala.");
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join?code=${created.code}` : "";
    return (
      <PageShell title="Sala creada" subtitle="Proyecta o comparte el enlace para que cada mesa registre su equipo.">
        <div className="mx-auto max-w-lg space-y-4">
          <Card>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-xs uppercase text-slate-400">Código de sala</div>
                <div className="mt-1 font-mono text-4xl font-black tracking-widest text-brand-700">{created.code}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-400">PIN de facilitador</div>
                <div className="mt-1 font-mono text-4xl font-black tracking-widest text-slate-800">{created.pin}</div>
              </div>
            </div>
            <p className="mt-4 break-all rounded-md bg-slate-50 px-3 py-2 text-center text-sm text-slate-500">
              Enlace para las mesas: {joinUrl}
            </p>
            <Callout tone="warn">
              Anota el <b>PIN</b> (6 dígitos): lo necesitas para controlar las semanas.
              Se admitirán hasta {created.maxTeams} equipos.
            </Callout>
          </Card>
          <Button size="lg" className="w-full" onClick={() => router.push(`/facilitator/${created.code}`)}>
            Ir al panel de control →
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Crear sala"
      subtitle="Configura la actividad. Podrás editar la demanda de cada semana antes de abrirla."
      right={<Link href="/" className="text-sm text-slate-500 hover:text-slate-700">← Inicio</Link>}
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <form onSubmit={handleCreate} className="space-y-5 lg:col-span-2">
          <Card title="Datos de la sala">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre de la actividad">
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
              </Field>
              <Field label="PIN de facilitador" hint="6 dígitos. Vacío = automático.">
                <Input
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Automático"
                  inputMode="numeric"
                />
              </Field>
              <Field label="Número de semanas">
                <Input type="number" min={1} max={5} value={rounds} onChange={(e) => setRounds(e.target.value)} />
              </Field>
              <Field label="Máximo de equipos" hint="Cada mesa registra uno.">
                <Input type="number" min={1} max={40} value={maxTeams} onChange={(e) => setMaxTeams(e.target.value)} />
              </Field>
              <Field label="Minutos por semana" hint="Valor inicial; podrás cambiarlo por ronda.">
                <Input
                  type="number"
                  min={0.5}
                  max={120}
                  step={0.5}
                  value={roundMinutes}
                  onChange={(e) => setRoundMinutes(e.target.value)}
                />
              </Field>
            </div>
          </Card>

          <Card title="Registro de equipos">
            <p className="text-sm text-slate-600">
              La sala comienza vacía. Comparte el código o el enlace: un representante
              de cada mesa elegirá el nombre, registrará a sus integrantes y recibirá
              una credencial privada de recuperación.
            </p>
          </Card>

          {error && <Callout tone="error">{error}</Callout>}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? <Spinner /> : "Crear sala"}
          </Button>
        </form>

        <div className="space-y-5">
          <Card title="¿Ya tienes una sala?">
            <p className="mb-3 text-sm text-slate-500">Entra a tu panel con el código (te pedirá el PIN).</p>
            <div className="flex gap-2">
              <Input
                value={existingCode}
                onChange={(e) => setExistingCode(e.target.value.toUpperCase())}
                placeholder="Código"
                className="text-center font-bold tracking-widest"
              />
              <Button variant="secondary" onClick={() => existingCode && router.push(`/facilitator/${existingCode.trim()}`)}>
                Ir
              </Button>
            </div>
          </Card>
          <Card title="Cómo funciona">
            <ol className="list-decimal space-y-1 pl-4 text-sm text-slate-600">
              <li>Comparte el código y espera que las mesas se registren.</li>
              <li>Revisa los nombres y cierra las inscripciones.</li>
              <li>Abre la semana para recibir pedidos.</li>
              <li>Configura el reloj; puedes cambiarlo antes o durante la semana.</li>
              <li>Revela: se calculan ventas, mermas y caja.</li>
              <li>Avanza a la siguiente semana.</li>
            </ol>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
