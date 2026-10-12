import Link from 'next/link';
export function SiteHeader({ active }: { active: 'home' | 'play' | 'leaderboard' | 'editor' }) {
  return <header className="site-header">
    <Link href="/" className="brand" aria-label="Purrvival home"><img className="brand-mark mew-brand-mark" src="/mewventure/pur-pur-icon.webp" alt="" width={44} height={44} /><span>Purrvival<span className="brand-subtitle">LITTLE PAWS. BIG ADVENTURES.</span></span></Link>
    <nav className="main-nav" aria-label="Main navigation">{([['home', '/', 'Home'], ['play', '/play', 'Play'], ['leaderboard', '/leaderboard', 'Leaderboard']] as const).map(([key, href, label]) => <Link key={key} href={href} className={active === key ? 'active' : ''} aria-current={active === key ? 'page' : undefined}>{label}</Link>)}</nav>
    <span className="header-tag"><span aria-hidden="true">♡</span> YOUR COZY LITTLE ESCAPE</span>
  </header>;
}
