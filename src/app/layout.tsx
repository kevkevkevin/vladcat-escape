import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./mewventure.css";
import "./mewventure-game-ui.css";
import { VladcatGuide } from '@/components/VladcatGuide';

const displayFont = localFont({
  src: "./fonts/LilitaOne-Regular.ttf",
  variable: "--font-display",
  weight: "400",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Purrvival — Tiny paws. Brave escapes.",
  description: "Help Pur Pur escape a cozy cave and find her owner EIRA. Play 49 puzzle stages, take the timed challenge, and join the quickest paws on the leaderboard.",
  icons: { icon: "/mewventure/pur-pur-icon.png", apple: "/mewventure/apple-icon.png" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#11130f" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={displayFont.variable}><body>{children}<VladcatGuide /></body></html>;
}
