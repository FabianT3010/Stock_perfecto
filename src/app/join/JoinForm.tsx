"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Callout, Card, Field, Input, Spinner, cx } from "@/components/ui";
import { readTeam, saveTeam } from "@/lib/v2/team";

type Mode = "create" | "recover";
type CreatedTeam = {
  code: string;
  name: string;
  recoveryCode: string;
};

export default function JoinForm({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [mode, setMode] = useState<Mode>("create");
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [members, setMembers] = useState("");
  const [created, setCreated] = useState<CreatedTeam | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const roomCode = code.trim().toUpperCase();
    const recoveryCode = teamCode.trim().toUpperCase();
    const existing = roomCode ? readTeam(roomCode) : null;
    if (!roomCode) {
      setError("Escribe el código de sala.");
      return;
    }
    if (!existing && mode === "create" && teamName.trim().length < 2) {
      setError("Escribe un nombre para tu equipo.");
      return;
    }
    if (!existing && mode === "recover" && !recoveryCode) {
      setError("Escribe el código privado de recuperación.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v2/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: roomCode,
          teamName: mode === "create" ? teamName : undefined,
          teamCode: mode === "recover" ? recoveryCode : undefined,
          members: members.split(",").map((member) => member.trim()).filter(Boolean),
          token: existing?.token,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo entrar a la sala.");
        return;
      }
      saveTeam(roomCode, { teamId: data.teamId, token: data.token, name: data.name });
      if (data.created && data.joinCode) {
        setCreated({ code: roomCode, name: data.name, recoveryCode: data.joinCode });
      } else {
        router.push(`/play/${roomCode}`);
      }
    } catch {
      setError("Error de red. Verifica tu conexión.");
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    return (
      <main className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-center px-4 py-10">
        <Card title="Equipo registrado">
          <div className="space-y-4 text-center">
            <div>
              <div className="text-sm text-slate-500">Ya pueden jugar como</div>
              <div className="mt-1 text-2xl font-black text-slate-900">{created.name}</div>
            </div>
            <div className="rounded-lg border border-accent-200 bg-accent-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-accent-700">
                Código privado de recuperación
              </div>
              <div className="mt-1 font-mono text-4xl font-black tracking-widest text-accent-800">
                {created.recoveryCode}
              </div>
            </div>
            <Callout tone="warn">
              Anótenlo o tomen una foto. Solo se usa si necesitan entrar desde otro celular.
              No lo compartan con otra mesa.
            </Callout>
            <Button size="lg" className="w-full" onClick={() => router.push(`/play/${created.code}`)}>
              Entrar a la tienda →
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-6 text-sm text-slate-500 hover:text-slate-700">
        ← Inicio
      </Link>
      <Card title="Entrar a la actividad">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Código de sala" hint="Está proyectado por el facilitador.">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ej: KX7P9"
              autoCapitalize="characters"
              className="text-center text-lg font-bold tracking-widest"
              maxLength={8}
            />
          </Field>

          <div className="grid grid-cols-2 rounded-md bg-slate-100 p-1">
            {(["create", "recover"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setMode(option);
                  setError(null);
                }}
                className={cx(
                  "rounded px-3 py-2 text-sm font-semibold transition",
                  mode === option ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
                )}
              >
                {option === "create" ? "Crear equipo" : "Recuperar"}
              </button>
            ))}
          </div>

          {mode === "create" ? (
            <>
              <Field label="Nombre del equipo" hint="Debe ser único dentro de la sala.">
                <Input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Ej: Los Caseritos"
                  maxLength={30}
                  autoFocus
                />
              </Field>
              <Field label="Integrantes (opcional)" hint="Separados por coma; máximo 8.">
                <Input
                  value={members}
                  onChange={(e) => setMembers(e.target.value)}
                  placeholder="Ana, Beto, Caro"
                />
              </Field>
            </>
          ) : (
            <Field label="Código privado de recuperación" hint="Lo recibió el equipo al registrarse.">
              <Input
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                placeholder="Ej: M7Q4TX"
                autoCapitalize="characters"
                className="text-center text-lg font-bold tracking-widest"
                maxLength={6}
              />
            </Field>
          )}

          {error && <Callout tone="error">{error}</Callout>}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? <Spinner /> : mode === "create" ? "Registrar equipo" : "Recuperar equipo"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
