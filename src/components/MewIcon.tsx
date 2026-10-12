export function MewIcon({ name }: { name: 'paw' | 'heart' | 'star' | 'flag' | 'phone' }) {
  return <svg className="mew-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'paw' ? <><ellipse cx="5" cy="9" rx="2" ry="2.6" /><ellipse cx="10" cy="5.5" rx="2" ry="2.6" /><ellipse cx="16" cy="6" rx="2" ry="2.6" /><ellipse cx="20" cy="11" rx="2" ry="2.6" /><path d="M6.5 16c1.5-2 2.5-5 5.5-5s4 3 5.5 5c2.7 4.5-2.5 5.5-5.5 4-3 1.5-8.2.5-5.5-4Z" /></> : name === 'heart' ? <path d="M20.5 5.5C17 2 12 6 12 6S7 2 3.5 5.5C-1 10 7 16 12 20c5-4 13-10 8.5-14.5Z" /> : name === 'star' ? <path d="m12 2 2.8 6.5 7.2.8-5.3 4.8 1.6 7-6.3-3.7-6.3 3.7 1.6-7L2 9.3l7.2-.8L12 2Z" /> : name === 'flag' ? <><path d="M5 22V3m0 1c5-5 9 5 15 0v10c-6 5-10-5-15 0" /><path d="M5 19h-2" /></> : <><rect x="7" y="2" width="10" height="20" rx="3" /><path d="M10 5h4m-3 14h2M2 7 0 10l2 3m20-6 2 3-2 3" /></>}
  </svg>;
}
