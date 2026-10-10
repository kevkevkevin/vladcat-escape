import test from 'node:test';
import assert from 'node:assert/strict';
import { controls, publicAction, enqueueControls } from '../src/game/authority/protocol.mjs';
import { GameAudio } from '../src/game/authority/audio.mjs';
import { attestSplit, verifiedRun, rulesDigest } from '../src/game/authority/proofs.mjs';
import { AuthoritySession } from '../src/game/authority/session.mjs';

const input = { sequence: 1, keys: ['ArrowRight'], pointer: null, paused: false };
test('pointer coalescing preserves the original drag press and release coordinates', () => {
  const queue = [];
  const at = (x, down) => ({ keys: [], pointer: { x, y: 300, down }, paused: false });
  enqueueControls(queue, at(32,false));
  enqueueControls(queue, at(32,true), true);
  enqueueControls(queue, at(100,true));
  enqueueControls(queue, at(758,true));
  enqueueControls(queue, at(758,false), true);
  assert.deepEqual(queue.map(v => [v.pointer.x,v.pointer.down]), [[32,false],[32,true],[758,true],[758,false]]);
  const keys = [];
  enqueueControls(keys, { keys: ['ArrowUp'], pointer: null, paused: false }, true);
  enqueueControls(keys, { keys: [], pointer: null, paused: false }, true);
  assert.equal(keys.length, 2, 'A fast jump press/release must survive buffering');
});
test('trusted audio deduplicates sound events, rejects arbitrary URLs and honors mute/stop', () => {
  const made = [];
  const audio = new GameAudio(url => { const item = { url, ended: false, play: () => Promise.resolve(), pause: () => { item.paused = true; } }; made.push(item); return item; });
  audio.receive([{ id: 1, type: 'play', name: 'Music', tag: 'music', loop: true, volume: 0.5 }]);
  audio.receive([{ id: 1, type: 'play', name: 'Music', tag: 'music', loop: true, volume: 0.5 }]);
  audio.receive([{ id: 2, type: 'play', name: 'https://evil.example/x', tag: '', volume: 1 }]);
  assert.equal(made.length, 1); assert.equal(made[0].url, '/game/media/Music.webm');
  audio.receive([{ id: 3, type: 'mute', tag: 'music', muted: true }]); assert.equal(made[0].muted, true);
  audio.receive([{ id: 4, type: 'stop', tag: 'music' }]); assert.equal(made[0].paused, true); assert.equal(audio.items.length, 0);
});
test('public clients can send controls, never completion, time, state, URLs or code', () => {
  assert.deepEqual(controls(input), input);
  for (const action of ['checkpoint','play','heartbeat','teleport','setState']) assert.equal(publicAction(action), false);
  for (const extra of [{ stage: 5 }, { completed: true }, { x: 376 }, { script: 'window.EcodroidsTiming.completeStage(1)' }, { url: 'http://localhost' }, { totalMs: 0 }]) assert.throws(() => controls({ ...input, ...extra }), /Invalid/);
  for (const invalid of [{ keys: ['F12'] }, { keys: ['__proto__'] }, { keys: ['ArrowUp','ArrowUp'] }, { sequence: 0 }, { pointer: { x: Infinity, y: 0, down: true } }, { pointer: { x: 999, y: 0, down: true } }, { pointer: { x: 1, y: 1, down: true, stage: 5 } }]) assert.throws(() => controls({ ...input, ...invalid }), /Invalid/);
});
test('reward eligibility requires all 49 signed solves bound to account, run, rules and time', () => {
  const secret = 'test-signing-key-with-more-than-thirty-two-characters';
  const rules = rulesDigest({ version: 'example' });
  const run = { id: 'run-a', user_id: 'alice', status: 'completed', stage: 50, total_ms: 49000 };
  run.splits = Array.from({ length: 49 }, (_, i) => attestSplit(run, { stage: i + 1, milliseconds: 1000 }, rules, secret));
  assert.equal(verifiedRun(run, secret), true);
  for (const changed of [{ id: 'run-b' }, { user_id: 'bob' }, { total_ms: 1 }, { status: 'active' }, { stage: 49 }, { splits: run.splits.slice(1) }]) assert.equal(verifiedRun({ ...run, ...changed }, secret), false);
  const forged = structuredClone(run); forged.splits[3].milliseconds = 999;
  assert.equal(verifiedRun(forged, secret), false);
  const copied = structuredClone(run); copied.splits[4].verification = copied.splits[3].verification;
  assert.equal(verifiedRun(copied, secret), false);
  assert.equal(verifiedRun(run, 'different-key-with-more-than-thirty-two-characters'), false);
  assert.equal(verifiedRun({ ...run, splits: run.splits.map(({ stage, milliseconds }) => ({ stage, milliseconds })) }, secret), false);
});
function fixture() {
  let now = 0;
  const events = [];
  const state = { layout: 'Level_1', stage: 1, blocked: true, events };
  const calls = [];
  let run = { id: 'test', token: 'session', stage: 1, status: 'paused', stageMs: 0, totalMs: 0, splits: [] };
  let stageStart = 0;
  const engine = { snapshot: async () => ({ ...structuredClone(state), timing: { stage: Number(state.layout.slice(6)), stageMs: now - stageStart, totalMs: run.totalMs + now - stageStart, splits: run.splits, stopped: state.blocked, eligible: true, finished: false, reason: '' } }), pause: async v => { state.blocked = v; }, input: async () => {}, acknowledge: async n => events.splice(0, n), frame: async () => 'frame', close: async () => {} };
  const session = new AuthoritySession(engine, run, {
    progress: async timing => { calls.push(timing.stopped ? 'pause' : 'play'); run = { ...run, status: timing.stopped ? 'paused' : 'active', stageMs: timing.stageMs }; return run; },
    checkpoint: async (stage, milliseconds) => { calls.push(`solved:${stage}`); stageStart = now; run = { ...run, status: 'paused', stageMs: 0, stage: stage + 1, splits: [...run.splits, { stage, milliseconds }] }; return run; },
  }, () => now);
  return { session, state, calls, advanceTime: n => { now += n; } };
}
test('waiting or arbitrary valid inputs never advance a stage without an engine exit', async () => {
  const f = fixture();
  await f.session.input(input);
  f.advanceTime(5000); await f.session.tick();
  assert.equal(f.session.run.stage, 1); assert.ok(!f.calls.some(c => c.startsWith('solved')));
  await assert.rejects(f.session.input(input), /Input order/);
  assert.equal(f.session.run.stage, 1);
  f.state.events.push({ stage: 1, tick: 100, milliseconds: 5000 }); f.state.stage = 2; f.state.layout = 'Level_2';
  await f.session.tick();
  assert.equal(f.session.run.stage, 2); assert.equal(f.calls.filter(c => c === 'solved:1').length, 1);
  await f.session.tick(); assert.equal(f.calls.filter(c => c === 'solved:1').length, 1);
});
test('disconnect and pause stop both simulation and clock; skipped layouts fail closed', async () => {
  const f = fixture(); await f.session.input(input);
  f.advanceTime(6100); await f.session.tick();
  assert.equal(f.state.blocked, true); assert.equal(f.session.run.status, 'paused');
  await f.session.input({ ...input, sequence: 2 }); await f.session.suspend();
  assert.equal(f.state.blocked, true); assert.equal(f.session.run.status, 'paused');
  f.state.layout = 'Level_5'; await assert.rejects(f.session.tick(), /Unverified stage transition/);
});
test('out-of-order engine exits and invalid durations cannot mint receipts', async () => {
  const f = fixture(); f.state.events.push({ stage: 5, tick: 10, milliseconds: 10 });
  await assert.rejects(f.session.tick(), /stage order/);
  f.state.events.splice(0,1,{ stage: 1, tick: 11, milliseconds: 0 });
  await assert.rejects(f.session.tick(), /stage order/);
  assert.ok(!f.calls.some(c => c.startsWith('solved')));
});
test('slow database saves do not delay controls or set the engine stopwatch', async () => {
  const f = fixture();
  await f.session.input(input);
  f.advanceTime(1500);
  let release;
  const progress = f.session.adapter.progress;
  f.session.adapter.progress = timing => new Promise(resolve => { release = async () => resolve(await progress(timing)); });
  const pending = f.session.tick();
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(release, 'A simulated slow save is outstanding');
  const response = await Promise.race([f.session.input({ ...input, sequence: 2 }), new Promise((_, reject) => setTimeout(() => reject(new Error('Controls waited for database')), 100))]);
  assert.equal(response.sequence, 2);
  f.advanceTime(500);
  await release();
  const frame = await pending;
  assert.equal(frame.timing.stageMs, 2000, 'Displayed time is the trusted engine time after the save delay');
});
test('pausing before the first background save still persists elapsed gameplay', async () => {
  const f = fixture(); await f.session.input(input);
  f.advanceTime(120); await f.session.suspend();
  assert.equal(f.session.run.stageMs, 120);
  assert.equal(f.session.run.status, 'paused');
});
