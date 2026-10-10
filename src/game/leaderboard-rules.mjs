import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const RULESET = "ecodroids-timed-v1";
export const TIMED_STAGES = 49;
export const MAX_RUN_MS = 24 * 60 * 60 * 1000;

export function playerName(value) {
  if (typeof value !== "string") throw new Error("Enter a player name.");
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 24 || /[\u0000-\u001f\u007f]/u.test(name)) throw new Error("Use a player name of 1–24 characters.");
  return name;
}

export function xHandle(value) {
  if (typeof value !== "string") throw new Error("Enter your X handle.");
  const handle = value.trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) throw new Error("Use an X handle of 1–15 letters, numbers or underscores.");
  return `@${handle}`;
}

export function issueTicket(name, secret, now = Date.now()) {
  const payload = { id: randomUUID(), name: playerName(name), startedAt: now, ruleset: RULESET };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return { ...payload, token: `${body}.${signature}` };
}

export function verifyTicket(token, secret, now = Date.now()) {
  if (typeof token !== "string" || token.length > 2048) throw new Error("Invalid run ticket.");
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra) throw new Error("Invalid run ticket.");
  const expected = createHmac("sha256", secret).update(body).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(expected, supplied)) throw new Error("Invalid run ticket.");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString());
  if (payload.ruleset !== RULESET || typeof payload.id !== "string" || !Number.isSafeInteger(payload.startedAt) || payload.startedAt > now || now - payload.startedAt > MAX_RUN_MS) throw new Error("This run expired. Start a new ranked run.");
  playerName(payload.name);
  return payload;
}

export function scoreRun(token, splits, secret, now = Date.now()) {
  const ticket = verifyTicket(token, secret, now);
  if (!Array.isArray(splits) || splits.length !== TIMED_STAGES) throw new Error("Complete every stage before submitting a score.");
  const stages = splits.map((split, index) => {
    if (split?.stage !== index + 1 || !Number.isSafeInteger(split.milliseconds) || split.milliseconds < 1 || split.milliseconds > MAX_RUN_MS) throw new Error("Invalid stage times. Complete all stages in order.");
    return { stage: split.stage, milliseconds: split.milliseconds };
  });
  const totalMs = stages.reduce((sum, split) => sum + split.milliseconds, 0);
  if (totalMs > MAX_RUN_MS || totalMs > now - ticket.startedAt + 1000) throw new Error("Stage times exceed the duration of this run.");
  return { id: ticket.id, name: ticket.name, totalMs, splits: stages, completedAt: new Date(now).toISOString(), ruleset: RULESET };
}

export function rankEntries(entries) {
  return [...entries].sort((a, b) => a.totalMs - b.totalMs || a.completedAt.localeCompare(b.completedAt) || a.id.localeCompare(b.id));
}

export function abandonRun(token, splits, stage, stageMs, secret, now = Date.now()) {
  const ticket = verifyTicket(token, secret, now);
  if (!Array.isArray(splits) || splits.length >= TIMED_STAGES || !Number.isSafeInteger(stage) || stage < 1 || stage > TIMED_STAGES || stage < splits.length || (stage === splits.length && stageMs !== 0)) throw new Error("Only an unfinished challenge can join the list of shames.");
  const stages = splits.map((split, index) => {
    if (split?.stage !== index + 1 || !Number.isSafeInteger(split.milliseconds) || split.milliseconds < 1 || split.milliseconds > MAX_RUN_MS) throw new Error("Invalid completed stage times.");
    return { stage: split.stage, milliseconds: split.milliseconds };
  });
  if (!Number.isSafeInteger(stageMs) || stageMs < 0 || stageMs > MAX_RUN_MS) throw new Error("Invalid current stage time.");
  const totalMs = stages.reduce((sum, split) => sum + split.milliseconds, 0) + stageMs;
  if (totalMs > MAX_RUN_MS || totalMs > now - ticket.startedAt + 1000) throw new Error("Stage times exceed the duration of this run.");
  return { id: ticket.id, name: ticket.name, totalMs, splits: stages, stage, stageMs, completedAt: new Date(now).toISOString(), outcome: "abandoned", ruleset: RULESET };
}
