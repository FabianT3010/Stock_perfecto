// Persistencia de la identidad del participante en el navegador (localStorage).
export type ParticipantIdentity = {
  participantId: string;
  token: string;
  name: string;
};

export function participantStorageKey(code: string): string {
  return `sp:participant:${code.toUpperCase()}`;
}

export function readParticipant(code: string): ParticipantIdentity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(participantStorageKey(code));
    return raw ? (JSON.parse(raw) as ParticipantIdentity) : null;
  } catch {
    return null;
  }
}

export function clearParticipant(code: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(participantStorageKey(code));
}
