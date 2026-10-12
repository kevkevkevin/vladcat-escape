import Link from 'next/link';
export function SiteFooter() {
  return <footer className="site-footer"><span>MADE FOR CURIOUS PAWS & HAPPY HEARTS.</span><div><Link href="/play">Play</Link><Link href="/leaderboard">Leaderboard</Link><Link href="/#token">Token & community</Link></div><span>Purrvival <span aria-hidden="true">♡</span></span></footer>;
}
