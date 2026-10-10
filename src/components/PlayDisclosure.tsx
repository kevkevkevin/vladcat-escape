"use client";
import { useEffect, useState, type ReactNode } from 'react';
export function PlayDisclosure({ id, title, hint, children, desktopOpen = true }: { id: string; title: string; hint: string; children: ReactNode; desktopOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 761px) and (min-height: 551px)');
    const resize = () => setOpen(media.matches && desktopOpen);
    resize(); media.addEventListener('change', resize);
    return () => media.removeEventListener('change', resize);
  }, [desktopOpen]);
  return <details id={id} className="play-disclosure" open={open} onToggle={event => setOpen(event.currentTarget.open)}><summary><span>{title}</span><span className="disclosure-hint">{hint}</span><span className="disclosure-chevron" aria-hidden="true">+</span></summary><div className="disclosure-content">{children}</div></details>;
}
