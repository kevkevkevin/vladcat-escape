import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
export const PROOF_VERSION = 'vladcat-server-engine-v1';
export function rulesDigest(source) { return createHash('sha256').update(JSON.stringify(source)).digest('hex'); }
function payload(run, split, rules) {
  return JSON.stringify([PROOF_VERSION, run.id, run.user_id, split.stage, split.milliseconds, rules]);
}
function key(secret) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('Server verification key unavailable');
  // Separate the signing purpose even when deriving from the server-only key.
  return createHmac('sha256', secret).update(PROOF_VERSION).digest();
}
export function attestSplit(run, split, rules, secret) {
  if (!/^[a-f0-9]{64}$/.test(rules)) throw new Error('Invalid rules digest');
  return { ...split, verification: { version: PROOF_VERSION, rules, signature: createHmac('sha256', key(secret)).update(payload(run, split, rules)).digest('hex') } };
}
export function verifiedSplit(run, split, secret) {
  try {
    const p = split.verification;
    if (p?.version !== PROOF_VERSION || !/^[a-f0-9]{64}$/.test(p.rules) || !/^[a-f0-9]{64}$/.test(p.signature)) return false;
    const expected = createHmac('sha256', key(secret)).update(payload(run, split, p.rules)).digest();
    return timingSafeEqual(expected, Buffer.from(p.signature, 'hex'));
  } catch { return false; }
}
export function verifiedRun(run, secret) {
  return run.status === 'completed' && run.stage === 50 && Array.isArray(run.splits) && run.splits.length === 49 &&
    run.splits.every((split, i) => split.stage === i + 1 && Number.isSafeInteger(split.milliseconds) && split.milliseconds >= 1 && verifiedSplit(run, split, secret)) &&
    run.splits.reduce((total, split) => total + split.milliseconds, 0) === Number(run.total_ms);
}
