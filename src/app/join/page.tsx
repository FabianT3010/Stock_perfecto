"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Callout, Card, Field, Input, Spinner } from "@/components/ui";
import { participantStorageKey } from "@/lib/participant";
import type { JoinResponse } from "@/lib/types";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Precargar el código desde ?code=XXXX si el facilitador compartió el enlace.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("code");
    if (c) setCode(c.toUpperCase());
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();
    if (!trimmedCode || !trimmedName) {
      setError("Completa el código y tu nombre.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmedCode, name: trimmedName }),
      });
      const data = (await res.json()) as JoinResponse | { error: string };
      if (!res.ok) {
        setError("error" in data ? data.error : "No se pudo unir a la sala.");
        setLoading(false);
        return;
      }
      const joined = data as JoinResponse;
      localStorage.setItem(
        participantStorageKey(joined.session.code),
        JSON.stringify({
          participantId: joined.participantId,
          token: joined.token,
          name: joined.name,
        }),
      );
      router.push(`/play/${joined.session.code}`);
    } catch {
      setError("Error de red. Verifica tu conexión.");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-6 text-sm text-slate-500 hover:text-slate-700">
        ← Inicio
      </Link>
      <Card title="Unirme a una sala">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Código de sala" hint="Te lo dicta el facilitador.">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ej: KX7P9M"
              autoCapitalize="characters"
              className="text-center text-lg font-bold tracking-widest"
              maxLength={8}
            />
          </Field>
          <Field label="Tu nombre o equipo">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Kiosco de Ana"
              maxLength={40}
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
