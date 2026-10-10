export function LevelCreatorPreview() {
  return <section className="creator-preview" id="create-level" aria-labelledby="creator-title">
    <div className="creator-preview-art">
      <div className="preview-window-bar"><span aria-hidden="true">● ● ●</span><span>YOUR NEXT EVIL LITTLE IDEA</span><span className="coming-soon-badge">COMING SOON</span></div>
      <img src="/showcase/vladcat-editor-preview.jpg" alt="Preview of a VLADCAT level layout with platforms, traps, a key and an escape door" width={838} height={518} loading="lazy" />
      <span className="preview-image-label">LEVEL CREATOR · SNEAK PEEK</span>
    </div>
    <div className="creator-preview-copy">
      <span className="eyebrow">YOUR LEVEL. THEIR PROBLEM.</span>
      <h2 id="creator-title">Make an escape.<br /><span>Send some trouble.</span></h2>
      <p>Coming soon: edit your own level, dream up a devious little escape, and share it with your friends.</p>
      <p className="creator-taunt">“I made this for you. Who’s ready to take on the challenge?”</p>
      <div className="creator-preview-steps" aria-label="Planned level creator features"><span>BUILD IT</span><span aria-hidden="true">→</span><span>SHARE IT</span><span aria-hidden="true">→</span><span>DARE YOUR FRIENDS</span></div>
      <p className="creator-preview-note">A preview of what’s next. Editing, playtesting and sharing aren’t open yet.</p>
    </div>
  </section>;
}
