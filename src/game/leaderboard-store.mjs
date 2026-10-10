import fs from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import pg from "pg";
import { RULESET, rankEntries } from "./leaderboard-rules.mjs";

const shared = globalThis;
const dataDirectory = () => path.join(process.cwd(), ".data");
const databaseConfigured = () => Boolean(process.env.DATABASE_URL);

export async function signingSecret() {
  if (process.env.LEADERBOARD_SECRET && process.env.LEADERBOARD_SECRET.length >= 32) return process.env.LEADERBOARD_SECRET;
  if (process.env.NODE_ENV === "production") throw new Error("Online leaderboard setup requires LEADERBOARD_SECRET (at least 32 characters).");
  await fs.mkdir(dataDirectory(), { recursive: true });
  const file = path.join(dataDirectory(), "leaderboard-secret");
  try { await fs.writeFile(file, randomBytes(32).toString("hex"), { flag: "wx", mode: 0o600 }); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
  return (await fs.readFile(file, "utf8")).trim();
}

async function database() {
  if (!databaseConfigured()) {
    if (process.env.NODE_ENV === "production") throw new Error("Online leaderboard setup requires DATABASE_URL.");
    return null;
  }
  if (!shared.ecodroidsLeaderboardPool) {
    shared.ecodroidsLeaderboardPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 8000 });
    shared.ecodroidsLeaderboardPool.on("error", () => console.error("Leaderboard database connection interrupted."));
  }
  const pool = shared.ecodroidsLeaderboardPool;
  if (!shared.ecodroidsChallengeSchema) {
    shared.ecodroidsChallengeSchema = pool.query(`CREATE TABLE IF NOT EXISTS ecodroids_scores (
      id uuid PRIMARY KEY, ruleset text NOT NULL, player_name varchar(24) NOT NULL,
      total_ms integer NOT NULL CHECK (total_ms > 0), splits jsonb NOT NULL, completed_at timestamptz NOT NULL
    );
    ALTER TABLE ecodroids_scores ADD COLUMN IF NOT EXISTS outcome text NOT NULL DEFAULT 'completed';
    ALTER TABLE ecodroids_scores ADD COLUMN IF NOT EXISTS stage integer NOT NULL DEFAULT 50;
    ALTER TABLE ecodroids_scores ADD COLUMN IF NOT EXISTS stage_ms integer NOT NULL DEFAULT 0;
    ALTER TABLE ecodroids_scores DROP CONSTRAINT IF EXISTS ecodroids_scores_total_ms_check;
    ALTER TABLE ecodroids_scores ADD CONSTRAINT ecodroids_scores_total_ms_check CHECK (total_ms >= 0);
    `).catch((error) => { shared.ecodroidsChallengeSchema = null; throw error; });
  }
  await shared.ecodroidsChallengeSchema;
  return pool;
}

async function localEntries() {
  try { return JSON.parse(await fs.readFile(path.join(dataDirectory(), "leaderboard.json"), "utf8")); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
}

export async function readLeaderboard() {
  const pool = await database();
  const entries = pool ? (await pool.query(`SELECT id, player_name AS name, total_ms AS "totalMs", splits, completed_at AS "completedAt"
    FROM ecodroids_scores WHERE ruleset = $1 AND outcome = 'completed' ORDER BY total_ms ASC, completed_at ASC, id ASC LIMIT 100`, [RULESET])).rows.map((row) => ({ ...row, completedAt: row.completedAt.toISOString() }))
    : rankEntries((await localEntries()).filter((entry) => entry.ruleset === RULESET && entry.outcome !== "abandoned")).slice(0, 100);
  return { entries, storage: pool ? "online" : "development" };
}

export async function readShames() {
  const pool = await database();
  const entries = pool ? (await pool.query(`SELECT id, player_name AS name, total_ms AS "totalMs", stage,
    jsonb_array_length(splits) AS "completedStages", completed_at AS "abandonedAt"
    FROM ecodroids_scores WHERE ruleset = $1 AND outcome = 'abandoned' ORDER BY completed_at DESC, id ASC LIMIT 100`, [RULESET])).rows.map((row) => ({ ...row, abandonedAt: row.abandonedAt.toISOString() }))
    : (await localEntries()).filter((entry) => entry.ruleset === RULESET && entry.outcome === "abandoned")
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt) || a.id.localeCompare(b.id)).slice(0, 100)
      .map((entry) => ({ id: entry.id, name: entry.name, totalMs: entry.totalMs, stage: entry.stage, completedStages: entry.splits.length, abandonedAt: entry.completedAt }));
  return { entries, storage: pool ? "online" : "development" };
}

export async function saveScore(entry) {
  const pool = await database();
  if (pool) {
    const result = await pool.query(`INSERT INTO ecodroids_scores (id, ruleset, player_name, total_ms, splits, completed_at, outcome, stage, stage_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO UPDATE SET id = ecodroids_scores.id
      RETURNING outcome`,
    [entry.id, RULESET, entry.name, entry.totalMs, JSON.stringify(entry.splits), entry.completedAt, entry.outcome ?? "completed", entry.stage ?? 50, entry.stageMs ?? 0]);
    if (result.rows[0].outcome !== (entry.outcome ?? "completed")) throw new Error("This challenge has already ended.");
  } else {
    // Development runs share one Next server. Serial writes survive HMR and
    // avoid losing concurrent scores; production uses PostgreSQL transactions.
    const task = (shared.ecodroidsLeaderboardWrites ?? Promise.resolve()).then(async () => {
      await fs.mkdir(dataDirectory(), { recursive: true });
      const entries = await localEntries();
      const existing = entries.find((existing) => existing.id === entry.id);
      if (existing) {
        if ((existing.outcome ?? "completed") !== (entry.outcome ?? "completed")) throw new Error("This challenge has already ended.");
        return;
      }
      entries.push(entry);
      const file = path.join(dataDirectory(), "leaderboard.json");
      const temporary = `${file}.${randomBytes(6).toString("hex")}.tmp`;
      const completed = rankEntries(entries.filter((score) => score.outcome !== "abandoned")).slice(0, 1000);
      const abandoned = entries.filter((score) => score.outcome === "abandoned").sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 1000);
      await fs.writeFile(temporary, JSON.stringify([...completed, ...abandoned], null, 2));
      await fs.rename(temporary, file);
    });
    shared.ecodroidsLeaderboardWrites = task.catch(() => {});
    await task;
  }
}
