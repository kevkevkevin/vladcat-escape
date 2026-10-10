import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { abandonRun, xHandle, issueTicket, scoreRun } from "../src/game/leaderboard-rules.mjs";
import { readShames, readLeaderboard, saveScore } from "../src/game/leaderboard-store.mjs";
import { loadSource } from "../tools/game-source.mjs";
import { compileProject } from "../src/game/codec.mjs";

const secret = "challenge-test-secret-of-at-least-thirty-two-characters";
test("X handles are normalized and invalid reward identifiers are rejected", () => {
  assert.equal(xHandle(" Kevin_123 "), "@Kevin_123");
  assert.equal(xHandle("@Kevin_123"), "@Kevin_123");
  for (const invalid of ["", "@@Kevin", "Kevin Smith", "https://x.com/Kevin", "abcdefghijklmnop", "<script>"]) assert.throws(() => xHandle(invalid), /X handle/);
});

test("ending a challenge records partial time without accepting completed or forged runs", () => {
  const ticket = issueTicket(xHandle("Kevin"), secret, 0);
  const splits = [{ stage: 1, milliseconds: 1000 }];
  const entry = abandonRun(ticket.token, splits, 2, 500, secret, 5000);
  assert.equal(entry.totalMs, 1500); assert.equal(entry.stage, 2); assert.equal(entry.outcome, "abandoned");
  assert.equal(abandonRun(ticket.token, [], 1, 0, secret, 5000).totalMs, 0);
  assert.equal(abandonRun(ticket.token, splits, 1, 0, secret, 5000).totalMs, 1000); // Quit during the exit fade.
  assert.throws(() => abandonRun(ticket.token, splits, 1, 500, secret, 5000), /unfinished/);
  assert.throws(() => abandonRun(ticket.token, Array.from({ length: 49 }, (_, i) => ({ stage: i + 1, milliseconds: 1 })), 49, 0, secret, 5000), /unfinished/);
  assert.throws(() => abandonRun(ticket.token, [], 50, 0, secret, 5000), /unfinished/);
  assert.throws(() => abandonRun(ticket.token, [], 1, -1, secret, 5000), /Invalid current/);
  assert.throws(() => abandonRun(ticket.token, [], 1, 20000, secret, 5000), /exceed/);
  assert.throws(() => abandonRun("invalid.ticket", [], 1, 0, secret, 5000), /Invalid/);
});

test("the compiled original menu has no name input or actions that overwrite the outer handle", async () => {
  const source = await loadSource();
  const runtime = compileProject(source).project;
  const textType = source.types.findIndex((type) => type[0] === "TextInput");
  assert.ok(runtime[5].find((layout) => layout[0] === "Menu")[9].every((layer) => layer[14].every((instance) => instance[1] !== textType)));
  const visit = (events) => {
    for (const event of events) {
      assert.ok(!event.conditions?.some((condition) => condition.object === "TextInput"));
      assert.ok(!event.actions?.some((action) => action.object === "TextInput" || action.method === "C3.Plugins.System.Acts.SetVar" && action.parameters[0]?.[1] === 573750132122422));
      visit(event.children ?? []);
    }
  };
  visit(source.events.find((sheet) => sheet.name === "esMenu").events);
});

test("shames persist separately from rankings, duplicate quits are idempotent and run outcomes cannot change", async () => {
  const previousCwd = process.cwd(); const previousEnv = process.env.NODE_ENV; const previousDatabase = process.env.DATABASE_URL;
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ecodroids-challenge-"));
  try {
    process.chdir(directory); process.env.NODE_ENV = "test"; delete process.env.DATABASE_URL;
    const quitTicket = issueTicket("@quitter", secret, 0);
    const quit = abandonRun(quitTicket.token, [], 1, 1000, secret, 100000);
    const winner = scoreRun(issueTicket("@winner", secret, 0).token, Array.from({ length: 49 }, (_, i) => ({ stage: i + 1, milliseconds: 1000 })), secret, 100000);
    await Promise.all([saveScore(quit), saveScore(winner), saveScore(quit)]);
    assert.deepEqual((await readShames()).entries.map((entry) => entry.name), ["@quitter"]);
    assert.deepEqual((await readLeaderboard()).entries.map((entry) => entry.name), ["@winner"]);
    assert.equal((await readShames()).entries[0].completedStages, 0);
    const completion = scoreRun(quitTicket.token, Array.from({ length: 49 }, (_, i) => ({ stage: i + 1, milliseconds: 1000 })), secret, 100000);
    await assert.rejects(saveScore(completion), /already ended/);
    await assert.rejects(saveScore({ ...winner, outcome: "abandoned", stage: 1, stageMs: 0 }), /already ended/);
  } finally {
    process.chdir(previousCwd);
    if (previousEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousEnv;
    if (previousDatabase === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previousDatabase;
    await fs.rm(directory, { recursive: true, force: true });
  }
});
