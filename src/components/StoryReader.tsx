"use client";
import { useRef, useState } from "react";

const slides = [
  { title: "The Void Ruins", image: "/vladcat/vladcat-comic-01.webp", lines: ["CLANK WORLD is cracking. Another apocalypse before breakfast.", "VOID RUINS. Zero stars. Terrible service.", "They took my freedom. My abs are still free.", "Hey, you! Help me escape and save CLANK WORLD!"] },
  { title: "The way out", image: "/vladcat/vladcat-comic-02.webp", lines: ["Grab the key. Save the world. Eyes off my ass.", "These traps are clingier than my ex.", "Every door gets us closer. CLANK WORLD needs us!", "You bring the brains. I bring the dangerously tight pants. Let’s escape!"] },
];

export function StoryReader({ onBegin }: { onBegin: () => void }) {
  const [page, setPage] = useState(0);
  const reader = useRef<HTMLElement>(null);
  const slide = slides[page];
  function turn(next: number) { setPage(next); reader.current?.scrollIntoView({ block: "start", behavior: "smooth" }); }
  return <section ref={reader} className="story-reader" aria-label="VLADCAT comic story">
    <div className="story-heading"><div><span className="eyebrow">THE STORY · {page + 1} / 2</span><h2>{slide.title}</h2></div><span className="muted">Four panels. One very unlucky catguy.</span></div>
    <img className="comic-full" src={slide.image} alt={`${slide.title}: VLADCAT asks you to help him escape the Void Ruins and save CLANK WORLD. Dialogue is available below.`} width={1672} height={941} />
    <div className="comic-panels" aria-label={`Comic slide ${page + 1}`}>
      {slide.lines.map((line, index) => <div key={`${page}-${index}`} className="comic-panel" style={{ backgroundImage: `url('${slide.image}')`, backgroundPosition: `${index % 2 * 100}% ${Math.floor(index / 2) * 100}%` }} role="img" aria-label={`Panel ${page * 4 + index + 1}. VLADCAT: ${line}`} />)}
    </div>
    <div className="story-controls"><button className="button secondary" disabled={page === 0} onClick={() => turn(0)}>← Previous</button><span className="muted">{page + 1} of 2</span><button className="button primary" onClick={() => page === 0 ? turn(1) : onBegin()}>{page === 0 ? "Next slide →" : "Help VLADCAT escape →"}</button></div>
    <details className="comic-transcript"><summary>Read the dialogue</summary><ol start={page * 4 + 1}>{slide.lines.map(line => <li key={line}>{line}</li>)}</ol></details>
  </section>;
}
