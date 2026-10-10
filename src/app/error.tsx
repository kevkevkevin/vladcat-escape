"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="empty-state"><h1>The workshop couldn’t load.</h1><p>Your source files are still saved. Try loading the page again.</p><button className="button primary" onClick={reset}>Try again</button></main>;
}
