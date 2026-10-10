// Real game-engine and live API verification. All writes belong exclusively
// to disposable QA accounts; no real player score or profile is modified.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { chromium } from 'playwright';
import { loadSource } from '../tools/game-source.mjs';
import { createEngine, closeServerBrowser } from '../src/game/authority/browser.mjs';
import { verifiedSplit, verifiedRun, attestSplit, rulesDigest } from '../src/game/authority/proofs.mjs';
nextEnv.loadEnvConfig(process.cwd(), true);
const origin = 'http://127.0.0.1:3000';
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false }, realtime: { transport: WebSocket } });
const accounts = [];
const engines = [];
const report = { checks: [], errors: [], cleanup: false };
let browser; let context; let page; let run;
const wait = ms => new Promise(r => setTimeout(r, ms));
// Explicit unsigned fixtures are limited to this QA script, never created by
// the production engine when loading a player's saved progress.
const fixture = stage => ({ stage, name: '@qa', stageMs: 0, splits: Array.from({ length: stage - 1 }, (_, i) => ({ stage: i + 1, milliseconds: 1 })) });
function pass(name) { report.checks.push(name); console.log(JSON.stringify({ passed: name })); }
async function until(check, timeout = 12000) { const end = Date.now() + timeout; while (Date.now() < end) { if (await check()) return; await wait(30); } throw new Error('Verification timed out'); }
async function appRequest(path, method = 'GET', data) {
  // Use browser fetch after navigation: production Secure cookies are accepted
  // by Chrome on loopback HTTP, but APIRequestContext does not send them there.
  if (page) return page.evaluate(async ({ path, method, data }) => {
    const response = await fetch(path, { method, ...(data ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}) });
    return { status: response.status, body: await response.json() };
  }, { path, method, data });
  const response = await context.request.fetch(origin + path, { method, headers: { Origin: origin }, ...(data ? { data } : {}) });
  return { status: response.status(), body: await response.json() };
}
async function post(path, data, expected = 200) {
  const { status, body } = await appRequest(path, 'POST', data);
  assert.equal(status, expected, `${path}: ${body.error || 'Unexpected status'}`);
  return body;
}
async function row() {
  const { data, error } = await admin.from('vladcat_runs').select('*').eq('id', run.id).single();
  assert.equal(error, null); return data;
}
try {
  const source = await loadSource();
  // Exercise the actual existing puzzle engine, including pause and drag.
  let engine = await createEngine(source, fixture(5)); engines.push(engine);
  await engine.pause(false); await wait(500);
  assert.equal((await engine.snapshot()).events.length, 0);
  for (const [x,y,down] of [[32,336,true],[758,300,true],[758,300,false]]) {
    await engine.input({ keys: [], pointer: { x,y,down }, paused: false }); await wait(150);
  }
  await until(async () => (await engine.snapshot()).events.length === 1);
  assert.equal((await engine.snapshot()).events[0].stage, 5);
  await engine.close(); engines.pop();
  pass('Stage 5 genuine dragging reaches the exit in the isolated server engine');
  engine = await createEngine(source, fixture(1)); engines.push(engine);
  await engine.pause(false); await wait(400);
  const input = keys => engine.input({ keys, pointer: null, paused: false });
  const reachX = x => until(async () => (await engine.inspect()).spr_player_base[0]?.x >= x, 5000);
  await input(['ArrowRight']); await reachX(36);
  await input(['ArrowRight','ArrowUp']); await reachX(114);
  await input(['ArrowRight']); await reachX(122);
  await input(['ArrowRight','ArrowUp']);
  await until(async () => (await engine.inspect()).spr_key.length === 0, 5000);
  assert.equal((await engine.snapshot()).events.length, 0, 'Picking up the key alone must not complete the stage');
  await engine.pause(true);
  const before = (await engine.inspect()).spr_player_base[0]; await wait(300);
  assert.deepEqual((await engine.inspect()).spr_player_base[0], before);
  await engine.close(); engines.pop();
  pass('Stage 1 uses real platform physics, key pickup alone cannot complete it, pause freezes movement');
  engine = await createEngine(source, fixture(49)); engines.push(engine);
  await engine.pause(false); await wait(400);
  for (const down of [true,false,true,false]) {
    await engine.input({ keys: [], pointer: { x: 728, y: 40, down }, paused: false }); await wait(120);
  }
  const finalStage = await engine.snapshot();
  assert.equal(finalStage.stage, 50);
  assert.deepEqual(finalStage.events.map(event => event.stage), [49], 'Repeated final clicks cannot mint a stage-50 checkpoint');
  assert.equal(finalStage.blocked, true);
  await engine.close(); engines.pop();
  pass('Stage 49 genuine back-button solve ends the game once and freezes further inputs');
  // Loading all stages verifies availability of each special rule/layout.
  for (let stage = 1; !process.argv.includes('--live-only') && stage <= 49; stage++) {
    engine = await createEngine(source, fixture(stage)); engines.push(engine);
    assert.equal((await engine.snapshot()).layout, `Level_${stage}`);
    await engine.close(); engines.pop();
    if (stage % 10 === 0) console.log(JSON.stringify({ stagesLoaded: stage }));
  }
  if (!process.argv.includes('--live-only')) pass('All 49 challenge stages load in the trusted engine (smoke coverage)');
  await closeServerBrowser();
  const email = `vladcat-authority-qa-${crypto.randomUUID()}@example.com`;
  const password = crypto.randomBytes(24).toString('base64url');
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { vladcat_profile: { xHandle: '@authorityQA', walletAddress: '0x1234567890123456789012345678901234567890' } } });
  assert.equal(error, null); accounts.push(data.user.id);
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await post('/api/account', { action: 'login', email, password });
  page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(origin + '/play');
  await page.getByRole('button', { name: 'Take the challenge →', exact: true }).click();
  await page.locator('.authority-screen').waitFor({ timeout: 30000 });
  const progress = await appRequest('/api/progress');
  assert.equal(progress.status, 200, progress.body.error || 'Saved progress must load');
  run = progress.body.run;
  assert.equal(run.authoritative, true);
  await wait(600);
  for (const action of ['checkpoint','play','heartbeat']) await post('/api/runs', { action, id: run.id, token: crypto.randomUUID(), stage: 1, totalMs: 0 }, 403);
  await post('/api/leaderboard', { action: 'finish', id: run.id, token: crypto.randomUUID() }, 409);
  assert.equal((await row()).stage, 1);
  pass('Live login opens trusted stream; scripted checkpoints, timer claims and premature finish are rejected');
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await until(async () => (await row()).status === 'paused');
  const pausedTime = (await row()).stage_ms; await wait(500);
  assert.equal((await row()).stage_ms, pausedTime);
  await page.getByRole('button', { name: 'Resume game', exact: true }).first().click();
  await until(async () => (await row()).status === 'active');
  await page.screenshot({ path: 'artifacts/authority-desktop.png', fullPage: true });
  await page.reload();
  await page.getByRole('button', { name: 'Resume challenge →', exact: true }).click();
  await page.locator('.authority-screen').waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await until(async () => (await row()).status === 'paused');
  pass('Server pause freezes stored time, refresh resumes saved progress with a new engine');
  // Move only this disposable account's saved stage to exercise real stage-5
  // controls through production APIs. Earlier stages are deliberately unsigned;
  // this run cannot qualify for rewards. No production debug path is installed.
  const seeded = Array.from({ length: 4 }, (_, i) => ({ stage: i + 1, milliseconds: 1000 }));
  const patched = await admin.from('vladcat_runs').update({ stage: 5, splits: seeded, stage_ms: 0, total_ms: 4000 }).eq('id', run.id).eq('user_id', data.user.id);
  assert.equal(patched.error, null);
  await page.getByRole('button', { name: 'Reload saved stage', exact: true }).click();
  await page.locator('.authority-screen').waitFor({ timeout: 30000 });
  await page.getByText('STAGE 05 / 50', { exact: true }).waitFor();
  const screen = page.locator('.authority-screen');
  await screen.scrollIntoViewIfNeeded();
  const box = await screen.boundingBox();
  const x = v => box.x + v / 768 * box.width;
  const y = v => box.y + v / 432 * box.height;
  await page.mouse.move(x(32), y(336)); await page.mouse.down(); await wait(350);
  await page.mouse.move(x(758), y(300), { steps: 3 }); await wait(350); await page.mouse.up();
  await until(async () => (await row()).stage === 6, 15000);
  const solved = await row();
  const proofKey = process.env.VLADCAT_VERIFICATION_KEY || process.env.SUPABASE_SECRET_KEY;
  assert.equal(verifiedSplit(solved, solved.splits[4], proofKey), true);
  assert.equal(verifiedRun(solved, proofKey), false);
  pass('Live mouse dragging solves stage 5, persists a genuine signed receipt, and cannot verify unsigned earlier stages');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/authority-mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.getByRole('button', { name: 'End challenge', exact: true }).click();
  await page.getByRole('button', { name: 'View list of shames →' }).waitFor({ timeout: 15000 });
  await page.getByText('You’re on the list of shames. This challenge is over.', { exact: true }).waitFor({ timeout: 15000 });
  assert.equal((await row()).status, 'abandoned');
  await post('/api/runs', { action: 'resume', id: run.id }, 409);
  pass('Mobile layout fits viewport and ending a challenge persists an immutable shame record');
  const legacyId = crypto.randomUUID();
  const legacy = await admin.from('vladcat_runs').insert({ id: legacyId, user_id: data.user.id, handle: '@authorityQA', status: 'completed', stage: 50, total_ms: 49000, splits: Array.from({ length: 49 }, (_, i) => ({ stage: i + 1, milliseconds: 1000 })), finished_at: new Date().toISOString() });
  assert.equal(legacy.error, null);
  const legacyRow = await admin.from('vladcat_runs').select('token').eq('id', legacyId).single(); assert.equal(legacyRow.error, null);
  await post('/api/leaderboard', { id: legacyId, token: legacyRow.data.token }, 409);
  const boardResponse = await appRequest('/api/leaderboard');
  const board = boardResponse.body;
  assert.equal(boardResponse.status, 200, board.error || 'Leaderboard must load');
  assert.ok(!board.entries.some(entry => entry.id === legacyId));
  assert.ok(board.provisional.some(entry => entry.id === legacyId));
  pass('An unsigned 49-stage completion remains provisional and cannot pass the reward finish API');
  // Test final persistence and the ending UI with an explicitly seeded QA-only
  // prefix. This validates integration, not genuine solves of stages 1–48.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.reload();
  await page.getByRole('button', { name: 'Take the challenge →', exact: true }).click();
  await page.locator('.authority-screen').waitFor({ timeout: 30000 });
  run = (await appRequest('/api/progress')).body.run;
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await until(async () => (await row()).status === 'paused');
  const finalFixture = await row();
  const prefix = Array.from({ length: 48 }, (_, i) => attestSplit(finalFixture, { stage: i + 1, milliseconds: 1000 }, rulesDigest(source), proofKey));
  const finalPatch = await admin.from('vladcat_runs').update({ stage: 49, splits: prefix, stage_ms: 0, total_ms: 48000 }).eq('id', run.id).eq('user_id', data.user.id);
  assert.equal(finalPatch.error, null);
  await page.getByRole('button', { name: 'Reload saved stage', exact: true }).click();
  await page.getByText('STAGE 49 / 50', { exact: true }).waitFor();
  await screen.scrollIntoViewIfNeeded();
  const finalBox = await screen.boundingBox();
  await page.mouse.click(finalBox.x + 728 / 768 * finalBox.width, finalBox.y + 40 / 432 * finalBox.height);
  await until(async () => (await row()).status === 'completed', 15000);
  const finished = await row();
  assert.equal(verifiedRun(finished, proofKey), true);
  await page.getByText('Your time is on the leaderboard.', { exact: true }).waitFor({ timeout: 15000 });
  assert.ok(await page.locator('.escape-ending').textContent().then(text => text.includes('@authorityQA')));
  const finalized = await post('/api/leaderboard', { id: run.id, token: finished.token });
  assert.ok(finalized.entries.some(entry => entry.id === run.id));
  await post('/api/runs', { action: 'resume', id: run.id }, 409);
  pass('QA-only signed prefix plus genuine final solve commits once, renders personalized ending, and enters verified rankings');
  assert.ok(!JSON.stringify(board).includes('signature'));
  assert.ok(!JSON.stringify(board).includes(data.user.id));
  assert.equal(report.errors.length, 0);
  pass('Public boards expose no signatures/account IDs; no browser errors');
} catch (error) {
  report.failure = error.message; console.error(error.stack); process.exitCode = 1;
  if (context && run) {
    const last = await row().catch(() => null);
    console.log(JSON.stringify({ lastStage: last?.stage, lastStatus: last?.status, recordedSplits: last?.splits.length }));
    for (const page of context.pages()) { await page.screenshot({ path: 'artifacts/authority-failure.png', fullPage: true }).catch(() => {}); console.log(await page.locator('[role="alert"]').allTextContents()); }
  }
} finally {
  if (context && run) { try { await post('/api/shames', { id: run.id, token: (await row()).token }); } catch { /* cleanup deletes only QA account below */ } }
  await browser?.close();
  for (const engine of engines) await engine.close().catch(() => {});
  await closeServerBrowser();
  let cleaned = true;
  for (const id of accounts) { const { error } = await admin.auth.admin.deleteUser(id); if (error) cleaned = false; }
  report.cleanup = cleaned;
  await fs.writeFile('artifacts/authority-results.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ checks: report.checks.length, errors: report.errors.length, cleanup: report.cleanup }));
}
