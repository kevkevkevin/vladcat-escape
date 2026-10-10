"use client";
import { useEffect, useRef } from "react";
import { formatTime, type RunTiming } from "@/game/timing";

export function EndChallengeModal({ open, handle, timing, status, error, onRetry, onReturn }: {
  open: boolean; handle: string; timing: RunTiming | null; status: "saving" | "saved" | "error";
  error: string; onRetry: () => void; onReturn: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (open && !element?.open) element?.showModal();
    if (!open && element?.open) element.close();
  }, [open]);
  return <dialog ref={dialog} className="challenge-dialog" aria-labelledby="challenge-ended-title" aria-describedby="challenge-ended-message" onCancel={(event) => event.preventDefault()}>
    <div className="challenge-skull" aria-hidden="true">☠</div>
    <span className="eyebrow">VLADCAT CHALLENGE ENDED</span>
    <h2 id="challenge-ended-title">Noob motherfucker.</h2>
    <p id="challenge-ended-message">You don’t belong in Degenerates World.</p>
    <strong className="challenge-taunt">GAAAAAME OVER!</strong>
    <div className="challenge-receipt"><span>{handle}</span><span>Stage {timing?.stage ?? "—"} · {formatTime(timing?.totalMs ?? 0)}</span></div>
    <p className={status === "error" ? "challenge-save-error" : "muted"} role="status">{status === "saving" ? "Adding you to the list of shames…" : status === "saved" ? "You’re on the list of shames. This challenge is over." : error}</p>
    <div className="challenge-dialog-actions">
      {status === "error" && <button className="button primary" onClick={onRetry}>Retry saving</button>}
      <button className="button secondary" disabled={status === "saving"} onClick={onReturn}>{status === "error" ? "Return without saving" : "View list of shames →"}</button>
    </div>
  </dialog>;
}
