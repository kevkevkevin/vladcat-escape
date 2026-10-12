import type { Metadata, Viewport } from 'next';
import { GameWorkspace } from '@/components/GameWorkspace';
export const metadata: Metadata = { title: 'Play | Purrvival', description: 'Get comfy in practice, then take the Purrvival challenge and beat the clock.' };
export const viewport: Viewport = { themeColor: '#faf9fe' };
export default function PlayPage() { return <GameWorkspace mode="play" />; }
