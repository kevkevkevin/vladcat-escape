import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { issueTicket, scoreRun, verifyTicket, rankEntries } from "../src/game/leaderboard-rules.mjs";
import { readLeaderboard, saveScore } from "../src/game/leaderboard-store.mjs";
const timerCode = await fs.readFile(new URL("../public/game/run-timer.js", import.meta.url), "utf8");
const { RunTimer } = await import(`data:text/javascript;base64,${Buffer.from(timerCode).toString("base64")}`);
const secret = "test-secret-that-is-at-least-thirty-two-characters";
const splits = Array.from({ length: 49 }, (_, index) => ({ stage: index + 1, milliseconds: 1000 }));

test("each stage resets while retries retain time and total adds each split once", () => {
  const timer = new RunTimer(true);
  timer.enterLayout("Level_1", 0); timer.step(1000);
  timer.playing = false; timer.enterLayout("Level_1", 1500); timer.step(2500);
  timer.completeStage(3000); timer.completeStage(3500);
  assert.equal(timer.snapshot().totalMs, 2500);
  assert.equal(timer.splits.length, 1);
  timer.enterLayout("Level_2", 4000); timer.step(4700);
  assert.equal(timer.snapshot().stageMs, 700);
  assert.equal(timer.snapshot().totalMs, 3200);
  assert.equal(timer.snapshot().eligible, true);
});

test("pauses, hidden-tab suspension, menus, loading and exit fades do not add time", () => {
  const timer = new RunTimer(true);
  timer.enterLayout("Level_1", 1000); timer.step(2000);
  timer.step(2000, true); timer.step(9000, true); timer.step(9000, false);
  timer.completeStage(10000); timer.step(15000);
  assert.equal(timer.snapshot().stageMs, 2000);
  timer.enterLayout("Level_2", 16000); timer.step(17000); timer.enterLayout("Menu", 17000);
  timer.step(30000); timer.enterLayout("Level_2", 31000); timer.step(32000);
  assert.equal(timer.snapshot().totalMs, 4000);
});

test("the stage-48 menu puzzle can return to the same stage and remain ranked", () => {
  const timer = new RunTimer(true);
  for (let stage = 1; stage <= 47; stage++) { timer.enterLayout(`Level_${stage}`, stage * 2000); timer.completeStage(stage * 2000 + 1000); }
  timer.enterLayout("Level_48", 100000); timer.step(101000); timer.enterLayout("Menu", 101000);
  timer.enterLayout("Level_48", 110000); timer.completeStage(111000);
  assert.equal(timer.snapshot().stageMs, 2000);
  assert.equal(timer.snapshot().eligible, true);
});

test("only a sequential full run finishes at the congratulations layout", () => {
  const timer = new RunTimer(true);
  for (let stage = 1; stage <= 49; stage++) { timer.enterLayout(`Level_${stage}`, stage * 2000); timer.completeStage(stage * 2000 + 1000); }
  timer.enterLayout("Level_50", 110000);
  assert.equal(timer.snapshot().finished, true);
  assert.equal(timer.snapshot().totalMs, 49000);
  assert.equal(timer.snapshot().eligible, true);
  const preview = new RunTimer(); preview.enterLayout("Level_50", 0);
  assert.equal(preview.snapshot().finished, false);
  const practice = new RunTimer(); practice.enterLayout("Level_5", 0);
  assert.equal(practice.snapshot().reason, "Practice run");
  const skip = new RunTimer(true); skip.enterLayout("Level_1", 0); skip.enterLayout("Level_2", 1000);
  assert.equal(skip.snapshot().eligible, false);
  timer.enterLayout("Level_1", 120000);
  assert.equal(timer.snapshot().finished, false);
  assert.equal(timer.snapshot().totalMs, 0);
  assert.equal(timer.snapshot().eligible, false);
});

test("genuine exits call the timing hook; skip actions use the ordinary constant", async () => {
  const sheet = JSON.parse(await fs.readFile(new URL("../src/game/events/esLevels.json", import.meta.url)));
  const all = []; const walk = (events) => { for (const event of events) { all.push(event); walk(event.children ?? []); } }; walk(sheet.events);
  for (const line of [148, 168]) assert.equal(all.find((event) => event.line === line).actions.find((action) => action.method.endsWith(".AddVar")).parameters[1][1][0], 138);
  assert.equal(all.find((event) => event.line === 163).actions.find((action) => action.method.endsWith(".AddVar")).parameters[1][1][0], 3);
  let calls = 0;
  const context = { self: { C3: {}, EcodroidsTiming: { completeStage() { calls++; } } } };
  vm.runInNewContext(await fs.readFile(new URL("../src/game/expressions.js", import.meta.url), "utf8"), context);
  const completion = context.self.C3_ExpressionFuncs[138]({ _GetNode: () => ({ GetVar: () => ({ GetValue: () => 5 }) }) });
  assert.equal(calls, 0); // Engine binding must not record an early completion.
  assert.equal(completion(), 1); assert.equal(calls, 1);
});

test("server computes total, rejects forged tickets, malformed or partial stage lists", () => {
  const ticket = issueTicket("  Kevin  ", secret, 0);
  const score = scoreRun(ticket.token, splits, secret, 60000);
  assert.equal(score.totalMs, 49000); assert.equal(score.name, "Kevin");
  assert.throws(() => verifyTicket(ticket.token + "x", secret, 60000), /Invalid/);
  assert.throws(() => scoreRun(ticket.token, splits.slice(1), secret, 60000), /every stage/);
  assert.throws(() => scoreRun(ticket.token, splits.map((split) => ({ ...split, milliseconds: NaN })), secret, 60000), /Invalid stage/);
  assert.throws(() => scoreRun(ticket.token, splits.map((split) => ({ ...split, stage: 1 })), secret, 60000), /in order/);
  assert.throws(() => scoreRun(ticket.token, splits, secret, 20000), /exceed/);
  assert.throws(() => verifyTicket(ticket.token, secret, 25 * 60 * 60 * 1000), /expired/);
  assert.throws(() => issueTicket("", secret), /player name/);
});

test("rankings place least total first and resolve ties consistently", () => {
  const entry = (id, totalMs, completedAt) => ({ id, totalMs, completedAt });
  assert.deepEqual(rankEntries([entry("slow", 3000, "2026-10-01"), entry("later", 1000, "2026-10-02"), entry("early", 1000, "2026-10-01")]).map((score) => score.id), ["early", "later", "slow"]);
});

test("development storage shares scores, preserves concurrent writes and deduplicates retries", async () => {
  const previousCwd = process.cwd(); const previousEnv = process.env.NODE_ENV; const previousDatabase = process.env.DATABASE_URL;
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ecodroids-scores-"));
  try {
    process.chdir(directory); process.env.NODE_ENV = "test"; delete process.env.DATABASE_URL;
    const scores = ["Kevin", "Alex", "Sam"].map((name, index) => scoreRun(issueTicket(name, secret, 0).token, splits.map((split) => ({ ...split, milliseconds: 1000 + index * 100 })), secret, 100000));
    await Promise.all([...scores, scores[0]].map(saveScore));
    assert.deepEqual((await readLeaderboard()).entries.map((score) => score.name), ["Kevin", "Alex", "Sam"]);
    assert.equal((await readLeaderboard()).entries.length, 3);
  } finally {
    process.chdir(previousCwd);
    if (previousEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousEnv;
    if (previousDatabase === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previousDatabase;
    // Only this test's explicitly created temporary directory is removed.
    await fs.rm(directory, { recursive: true, force: true });
  }
});
