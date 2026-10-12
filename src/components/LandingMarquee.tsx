"use client";
import { useState } from 'react';
export function LandingMarquee() {
  const [paused, setPaused] = useState(false);
  return <div className={`landing-strip landing-marquee${paused ? ' marquee-paused' : ''}`}>
    <p className="sr-only">Little paws. Big adventures. Play, purr, repeat. A little joy, every day.</p>
    <div className="marquee-track" aria-hidden="true">{[0, 1].map(copy => <div className="marquee-group" key={copy}><span>LITTLE PAWS, BIG ADVENTURES</span><span className="marquee-star">✧</span><span>PLAY, PURR, REPEAT</span><span className="marquee-star">♡</span><span>A LITTLE JOY, EVERY DAY</span><span className="marquee-star">✧</span></div>)}</div>
    <button className="marquee-control" aria-label={paused ? 'Resume marquee' : 'Pause marquee'} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? '▶' : 'Ⅱ'}</button>
  </div>;
}
