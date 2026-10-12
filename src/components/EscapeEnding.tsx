"use client";
import { useEffect, useState } from "react";
import { formatTime } from "@/game/timing";

export function EscapeEnding({ handle, totalMs, onReplay }: { handle: string; totalMs?: number; onReplay: () => void }) {
  const [siteUrl, setSiteUrl] = useState("");
  useEffect(() => { if (location.protocol === "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)) setSiteUrl(location.origin); }, []);
  const params = new URLSearchParams({ text: `I helped Pur Pur escape the Woof Woof dungeon in Purrvival! Next adventure: finding Eira.${totalMs ? ` My escape time: ${formatTime(totalMs)}.` : ""} #Purrvival #PurPur`, ...(siteUrl ? { url: siteUrl } : {}) });
  return <section className="escape-ending" aria-label="Pur Pur escaped">
    <img src="/game/images/purrvival-ending.webp" alt="Pur Pur escapes through a cracked dungeon wall, searches the caves for Eira, and meets a friendly orange cat. To be continued." width={1672} height={941} />
    <div className="ending-copy"><span className="eyebrow">TINY PAWS. BRAVE ESCAPE.</span><h2>We made it<span> out!</span></h2><p className="ending-thanks">Thank you for helping me, <strong>{handle || "adventure buddy"}</strong>!</p><p>The dungeon is behind us. Eira is still out there… and a new friend is waiting. To be continued!</p>{totalMs !== undefined && <p className="ending-total">Your escape time <time>{formatTime(totalMs)}</time></p>}<p className="ending-reward">Please share it on X and you will receive your reward.</p><div className="ending-actions"><a className="button primary" href={`https://twitter.com/intent/tweet?${params}`} target="_blank" rel="noopener noreferrer">Share on X ↗</a><button className="button secondary" onClick={onReplay}>Back to menu</button></div></div>
  </section>;
}
