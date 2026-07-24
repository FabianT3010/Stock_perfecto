"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Callout, Card, Field, Input, Spinner } from "@/components/ui";
import { readTeam, saveTeam } from "@/lib/v2/team";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("code");
    if (c) setCode(c.toUpperCase());
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cd = code.trim().toUpperCase();
    const nm = teamName.trim();
    if (!cd || !nm) {
      setError("Completa el código de la mesa y el nombre del equipo.");
      return;
    }
    setLoading(true);
    try {
      const existing = readTeam(cd);
      const res = await fetch("/api/v2/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: cd,
          teamName: nm,
          members: members.split(",").map((m) => m.trim()).filter(Boolean),
          token: existing?.token,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo entrar a la sala.");
        setLoading(false);
        return;
      }
      saveTeam(cd, { teamId: data.teamId, token: data.token, name: data.name });
      router.push(`/play/${cd}`);
    } catch {
      setError("Error de red. Verifica tu conexión.");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-6 text-sm text-slate-500 hover:text-slate-700">
        ← Inicio
      </Link>
      <Card title="Entrar con mi equipo">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Código de la mesa" hint="Está en el cartel de tu mesa.">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ej: KX7P9"
              autoCapitalize="characters"
              className="text-center text-lg font-bold tracking-widest"
              maxLength={8}
            />
          </Field>
          <Field label="Nombre del equipo">
            <Input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Ej: Los del fondo"
              maxLength={30}
            />
          </Field>
          <Field label="Integrantes (opcional)" hint="Separados por coma.">
            <Input
              value={members}
              onChange={(e) => setMembers(e.target.value)}
              placeholder="Ana, Beto, Caro"
            />
          </Field>
          {error && <Callout tone="error">{error}</Callout>}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? <Spinner /> : "Entrar"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
