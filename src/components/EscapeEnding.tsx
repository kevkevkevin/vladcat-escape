"use client";
import { useEffect, useState } from "react";
import { formatTime } from "@/game/timing";

export function EscapeEnding({ handle, totalMs, onReplay }: { handle: string; totalMs?: number; onReplay: () => void }) {
  const [siteUrl, setSiteUrl] = useState("");
  useEffect(() => { if (location.protocol === "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)) setSiteUrl(location.origin); }, []);
  const params = new URLSearchParams({ text: `I helped VLADCAT escape the Void Ruins and save CLANK WORLD!${totalMs ? ` My escape time: ${formatTime(totalMs)}.` : ""} #VLADCATESCAPE #CLANKWORLD`, ...(siteUrl ? { url: siteUrl } : {}) });
  return <section className="escape-ending" aria-label="VLADCAT victory">
    <img src="/vladcat/vladcat-ending.webp" alt="VLADCAT winks and gives you a thumbs-up in the restored mechanical city of CLANK WORLD" width={1672} height={941} />
    <div className="ending-copy"><span className="eyebrow">VOID RUINS ESCAPED · CLANK WORLD SAVED</span><h2>We made it<span> out.</span></h2><p className="ending-thanks">Thank you for helping me, <strong>{handle || "escape artist"}</strong>!</p><p>CLANK WORLD is safe. My pants barely survived.</p>{totalMs !== undefined && <p className="ending-total">Your escape time <time>{formatTime(totalMs)}</time></p>}<p className="ending-reward">Please share it on X and you will receive your reward.</p><div className="ending-actions"><a className="button primary" href={`https://twitter.com/intent/tweet?${params}`} target="_blank" rel="noopener noreferrer">Share on X ↗</a><button className="button secondary" onClick={onReplay}>Back to menu</button></div></div>
  </section>;
}
