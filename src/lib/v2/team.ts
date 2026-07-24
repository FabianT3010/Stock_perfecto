// Identidad del equipo en el navegador (localStorage). Permite reconexión.
export type TeamIdentity = { teamId: string; token: string; name: string };

export function teamStorageKey(code: string): string {
  return `sp2:team:${code.toUpperCase()}`;
}

export function readTeam(code: string): TeamIdentity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(teamStorageKey(code));
    return raw ? (JSON.parse(raw) as TeamIdentity) : null;
  } catch {
    return null;
  }
}

export function saveTeam(code: string, id: TeamIdentity): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(teamStorageKey(code), JSON.stringify(id));
}

export function clearTeam(code: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(teamStorageKey(code));
}
