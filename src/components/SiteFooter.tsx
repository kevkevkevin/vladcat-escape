import Link from 'next/link';
export function SiteFooter() {
  return <footer className="site-footer"><span>SHARP INSTINCTS. FASTER ESCAPES.</span><div><Link href="/play">Play</Link><Link href="/leaderboard">Leaderboard</Link><Link href="/#token">Token & community</Link></div><span>VLADCAT ESCAPE</span></footer>;
}
