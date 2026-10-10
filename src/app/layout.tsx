import type { Metadata, Viewport } from "next";
import "./globals.css";
import { VladcatGuide } from '@/components/VladcatGuide';

export const metadata: Metadata = {
  title: "VLADCAT ESCAPE",
  description: "One fearless catguy. Fifty twisted stages. Play VLADCAT ESCAPE, beat the clock, and preview the upcoming level creator.",
  icons: { icon: "/vladcat/mark.svg", apple: "/vladcat/apple-icon.png" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#11130f" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<VladcatGuide /></body></html>;
}
