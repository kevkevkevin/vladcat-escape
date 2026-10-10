"use client";
import { useState } from 'react';
export function LandingMarquee() {
  const [paused, setPaused] = useState(false);
  return <div className={`landing-strip landing-marquee${paused ? ' marquee-paused' : ''}`}>
    <p className="sr-only">Play hard. Escape faster. Repeat the chaos.</p>
    <div className="marquee-track" aria-hidden="true">{[0, 1].map(copy => <div className="marquee-group" key={copy}><span>PLAY HARD</span><span className="marquee-star">✳</span><span>ESCAPE FASTER</span><span className="marquee-star">✳</span><span>REPEAT THE CHAOS</span><span className="marquee-star">✳</span></div>)}</div>
    <button className="marquee-control" aria-label={paused ? 'Resume marquee' : 'Pause marquee'} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? '▶' : 'Ⅱ'}</button>
  </div>;
}
