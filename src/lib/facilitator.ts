// Persistencia de la credencial del facilitador (código + PIN) en el navegador.
export type FacilitatorCreds = { code: string; pin: string };

export function facilitatorStorageKey(code: string): string {
  return `sp:facilitator:${code.toUpperCase()}`;
}

export function readFacilitatorCreds(code: string): FacilitatorCreds | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(facilitatorStorageKey(code));
    return raw ? (JSON.parse(raw) as FacilitatorCreds) : null;
  } catch {
    return null;
  }
}

export function saveFacilitatorCreds(creds: FacilitatorCreds): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    facilitatorStorageKey(creds.code),
    JSON.stringify(creds),
  );
}

export function clearFacilitatorCreds(code: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(facilitatorStorageKey(code));
}
