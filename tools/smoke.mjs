// Smoke test del flujo real contra una app + Supabase en ejecución.
// Uso: npm run dev (otra terminal) y luego npm run smoke.
const BASE = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3100";

async function post(path, body, expected = 200) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (response.status !== expected) {
    throw new Error(`${path}: esperaba ${expected}, recibió ${response.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const created = await post("/api/v2/sessions", {
  name: "Smoke test",
  pin: "654321",
  maxTeams: 2,
  roundDurationMinutes: 1,
}, 201);
assert(created.teams.length === 0, "La sala debe comenzar sin equipos pre-creados.");
assert(created.session.registration_open, "La inscripción debe comenzar abierta.");
await post("/api/v2/rounds/open", { code: created.code, pin: created.pin, roundNumber: 1 }, 409);

await post("/api/v2/join", { code: created.code, teamName: "", members: [] }, 400);
const alfa = await post("/api/v2/join", {
  code: created.code,
  teamName: "Mesa Alfa",
  members: ["Ana"],
});
assert(alfa.created && /^[A-HJ-NP-Z2-9]{6}$/.test(alfa.joinCode), "El alta debe entregar un código privado.");
await post("/api/v2/join", { code: created.code, teamName: "mesa alfa" }, 409);

await post("/api/v2/facilitator/registration", {
  code: created.code,
  pin: created.pin,
  open: false,
});
await post("/api/v2/join", { code: created.code, teamName: "Mesa Beta" }, 409);
await post("/api/v2/facilitator/registration", {
  code: created.code,
  pin: created.pin,
  open: true,
});

const foreign = await post("/api/v2/sessions", {
  name: "Sala ajena",
  pin: "123456",
  maxTeams: 2,
}, 201);
const gamma = await post("/api/v2/join", {
  code: foreign.code,
  teamName: "Mesa Gamma",
});
await post("/api/v2/join", {
  code: created.code,
  teamCode: gamma.joinCode,
  members: [],
}, 401);
const recoveredAlfa = await post("/api/v2/join", {
  code: created.code,
  teamCode: alfa.joinCode,
});
assert(recoveredAlfa.teamId === alfa.teamId && !recoveredAlfa.created, "El código debe recuperar el mismo equipo.");
const beta = await post("/api/v2/join", {
  code: created.code,
  teamName: "Mesa Beta",
  members: ["Beto"],
});
await post("/api/v2/join", { code: created.code, teamName: "Mesa Extra" }, 409);

await post("/api/v2/rounds/time", {
  code: created.code,
  pin: created.pin,
  roundNumber: 1,
  seconds: 90,
});
await post("/api/v2/rounds/open", { code: created.code, pin: created.pin, roundNumber: 1 });
const facOpen = await post("/api/v2/facilitator/state", { code: created.code, pin: created.pin });
const round1 = facOpen.rounds.find((round) => round.round_number === 1);
assert(round1.status === "open" && round1.closes_at, "R1 debe abrir con cierre autoritativo.");
assert(!facOpen.session.registration_open, "Abrir R1 debe cerrar las inscripciones.");
const initialClose = Date.parse(round1.closes_at);
assert(round1.duration_seconds === 90, "R1 debe conservar la duración configurada antes de abrir.");
await post("/api/v2/rounds/time", {
  code: created.code,
  pin: created.pin,
  roundNumber: 1,
  seconds: 180,
});
const facRetimed = await post("/api/v2/facilitator/state", { code: created.code, pin: created.pin });
const retimedRound = facRetimed.rounds.find((round) => round.round_number === 1);
assert(retimedRound.duration_seconds === 180, "La duración debe poder cambiar mientras la ronda está abierta.");
assert(Date.parse(retimedRound.closes_at) >= initialClose + 80_000, "El reloj abierto debe reemplazarse por el nuevo valor.");

// Compra 0 es una decisión válida y debe encender el semáforo.
await post("/api/v2/orders", {
  code: created.code,
  teamId: alfa.teamId,
  token: alfa.token,
  roundId: round1.id,
  orders: [],
});
const facSubmitted = await post("/api/v2/facilitator/state", { code: created.code, pin: created.pin });
assert(facSubmitted.submittedTeamIds.includes(alfa.teamId), "El envío de compra 0 debe quedar registrado.");
assert(!facSubmitted.submittedTeamIds.includes(beta.teamId), "Beta debe quedar sin enviar para probar el piloto R1.");

await post("/api/v2/rounds/close", { code: created.code, pin: created.pin, roundNumber: 1 });
await post("/api/v2/rounds/time", {
  code: created.code,
  pin: created.pin,
  roundNumber: 1,
  seconds: 240,
}, 409);
await post("/api/v2/rounds/reveal", { code: created.code, pin: created.pin, roundNumber: 1 });
await post("/api/v2/rounds/reveal", { code: created.code, pin: created.pin, roundNumber: 1 }, 409);

const facRevealed = await post("/api/v2/facilitator/state", { code: created.code, pin: created.pin });
assert(facRevealed.snapshots.filter((snapshot) => snapshot.round_number === 1).length === 2, "Reveal debe persistir un KPI por equipo.");
assert(facRevealed.rounds.find((round) => round.round_number === 1).status === "revealed", "R1 debe quedar revelada.");
assert(facRevealed.teams.find((team) => team.id === beta.teamId).cash !== 800, "El piloto automático de Beta debe ejecutar una compra conservadora.");

// La máquina de estados debe impedir saltar semanas.
await post("/api/v2/rounds/open", { code: created.code, pin: created.pin, roundNumber: 3 }, 409);
await post("/api/v2/rounds/open", { code: created.code, pin: created.pin, roundNumber: 2 });

console.log(`SMOKE OK · sala ${created.code} · autorregistro, recuperación, cupo, tiempo editable, compra 0 y reveal validados`);
