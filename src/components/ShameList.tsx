"use client";
import { useEffect, useState } from "react";
import { formatTime, type ShameEntry } from "@/game/timing";

export function ShameList({ revision }: { revision: number }) {
  const [entries, setEntries] = useState<ShameEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch("/api/shames", { signal: controller.signal, cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setEntries(body.entries); setError("");
      } catch (e) { if (e instanceof Error && e.name !== "AbortError") setError(e.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load();
    const interval = window.setInterval(() => { if (!document.hidden) void load(); }, 15000);
    window.addEventListener("focus", load);
    return () => { controller.abort(); clearInterval(interval); window.removeEventListener("focus", load); };
  }, [revision, refresh]);
  return <section id="shames" className="leaderboard-card shame-card" aria-label="List of shames">
    <div className="leaderboard-heading"><div><span className="eyebrow">THE ONES WHO TAPPED OUT</span><h2>List of shames.</h2><p>Started the challenge. Didn’t finish it.</p></div><button className="button secondary" onClick={() => { setLoading(true); setRefresh(refresh + 1); }}>Refresh shames ↻</button></div>
    {error ? <p className="notice error" role="alert">{error}</p> : loading ? <p className="leaderboard-empty" role="status">Loading shames…</p> : !entries.length ? <p className="leaderboard-empty">Nobody has tapped out yet. Keep it that way.</p> : <div className="leaderboard-table-wrap"><table className="leaderboard-table"><thead><tr><th scope="col">X handle</th><th scope="col">Quit at</th><th scope="col">Finished</th><th scope="col">Time spent</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id}><th scope="row">{entry.name}</th><td>Stage {entry.stage.toString().padStart(2, "0")}</td><td>{entry.completedStages} / 49</td><td><time>{formatTime(entry.totalMs)}</time></td></tr>)}</tbody></table></div>}
  </section>;
}
