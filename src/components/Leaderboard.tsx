"use client";
import { useEffect, useState } from "react";
import { formatTime, type LeaderboardEntry } from "@/game/timing";

export function Leaderboard({ revision }: { revision: number }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [provisional, setProvisional] = useState<LeaderboardEntry[]>([]);
  const [storage, setStorage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch("/api/leaderboard", { signal: controller.signal, cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setEntries(body.entries); setProvisional(body.provisional ?? []); setStorage(body.storage); setError("");
      } catch (e) { if (e instanceof Error && e.name !== "AbortError") setError(e.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load();
    const interval = window.setInterval(() => { if (!document.hidden) void load(); }, 15000);
    window.addEventListener("focus", load);
    return () => { controller.abort(); clearInterval(interval); window.removeEventListener("focus", load); };
  }, [revision, refresh]);

  return <section id="leaderboard" className="leaderboard-card finishers-card" aria-label="Leaderboard">
    <div className="board-mascot"><img src="/mewventure/pur-pur-floating.webp" alt="PUR PUR floating happily above the finishers board" width={160} height={160} /><span>YOU DID IT! ♡</span></div>
    <div className="leaderboard-heading"><div><span className="eyebrow">PUR PUR’S HALL OF FAME</span><h2>The quickest paws.</h2><p>Completed, server-verified escapes. Lowest total time wins.</p></div><button className="button secondary" onClick={() => { setLoading(true); setRefresh(refresh + 1); }}>Refresh scores ↻</button></div>
    {storage === "development" && <p className="leaderboard-caption">Development leaderboard · shared by players connected to this server.</p>}
    {error ? <p className="notice error" role="alert">{error}</p> : loading ? <p className="leaderboard-empty" role="status">Loading scores…</p> : !entries.length ? <p className="leaderboard-empty">The first place is yours to chase. Start a ranked run and finish the game to post your time.</p> : <div className="leaderboard-table-wrap"><table className="leaderboard-table"><thead><tr><th scope="col">Rank</th><th scope="col">X handle</th><th scope="col">Total time</th><th scope="col">Stage times</th></tr></thead><tbody>{entries.map((entry, index) => <tr key={entry.id}><td className={index === 0 ? "first-place" : ""}>#{index + 1}</td><th scope="row">{entry.name}</th><td><time>{formatTime(entry.totalMs)}</time></td><td><details><summary>View splits</summary><div className="split-grid">{entry.splits.map((split) => <span key={split.stage}><small>Stage {split.stage.toString().padStart(2, "0")}</small><time>{formatTime(split.milliseconds)}</time></span>)}</div></details></td></tr>)}</tbody></table></div>}
    {!loading && !error && provisional.length > 0 && <details className="provisional-scores"><summary>Older unverified escapes ({provisional.length})</summary><p>These runs predate gameplay verification. They do not qualify for automatic rewards. Play a new challenge to earn a verified score.</p><ul>{provisional.map(entry => <li key={entry.id}>{entry.name} · {formatTime(entry.totalMs)} · Unverified</li>)}</ul></details>}
  </section>;
}
