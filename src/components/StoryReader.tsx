"use client";
import { useRef, useState } from "react";

const slides = [
  { title: "A little world worth saving", image: "/game/images/purrvival-story-01.webp", lines: [
    "PURVASIA — the world of cute, chubby cats. Eira: ‘Purvasia stays strong as long as the Purclan stays together.’ Pur Pur: ‘Right, Eira!’",
    "But peace never lasts forever… ‘WOOF! WOOF! WOOF!’ The invaders shout: ‘Take Purvasia!’",
    "Eira: ‘Pur Pur! Be brave for the Purclan!’ Pur Pur: ‘Eira!!’ The Purclan was scattered… and their leader was taken.",
  ] },
  { title: "Tiny paws. Enormous brain energy.", image: "/game/images/purrvival-story-02.webp", lines: [
    "Deep in the Woof Woof dungeon, Pur Pur had to use more than courage… Eira’s words: ‘Be brave for the Purclan.’ Pur Pur: ‘Okay, Pur Pur… less panic, more genius. I have tiny paws… but enormous brain energy.’",
    "One puzzle at a time, Pur Pur turned panic into progress. ‘Aha! Step on the shiny square, get the shiny key. Very advanced cat science.’ CLUNK! CLICK! SWISH! SCRITCH! ‘Definitely planned that. Probably.’",
    "By using his brain, Pur Pur unlocked the path ahead. ‘For Eira… for the Purclan… and for cats who are clearly too cute to fail! Big brain. Tiny paws. Outstanding performance.’ CREAK… Next: the escape route…",
  ] },
];

export function StoryReader({ onBegin }: { onBegin: () => void }) {
  const [page, setPage] = useState(0);
  const reader = useRef<HTMLElement>(null);
  const slide = slides[page];
  function turn(next: number) { setPage(next); reader.current?.scrollIntoView({ block: "start", behavior: "smooth" }); }
  return <section ref={reader} className="story-reader" aria-label="Purrvival comic story">
    <div className="story-heading"><div><span className="eyebrow">THE STORY · {page + 1} / 2</span><h2>{slide.title}</h2></div><a className="comic-zoom" href={slide.image} target="_blank" rel="noopener noreferrer">View full size ↗</a></div>
    <img className="comic-full" src={slide.image} alt={`${slide.title}. Three comic panels follow Pur Pur’s adventure to escape the Woof Woof dungeon and find Eira. Dialogue is available below.`} width={1672} height={941} />
    <div className="story-controls"><button className="button secondary" disabled={page === 0} onClick={() => turn(0)}>← Previous</button><span className="muted">{page + 1} of 2</span><button className="button primary" onClick={() => page === 0 ? turn(1) : onBegin()}>{page === 0 ? "Next slide →" : "Help Pur Pur escape →"}</button></div>
    <details className="comic-transcript"><summary>Read the dialogue</summary><ol start={page * 3 + 1}>{slide.lines.map(line => <li key={line}>{line}</li>)}</ol></details>
  </section>;
}
