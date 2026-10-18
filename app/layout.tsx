import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: { default: "Worth a Mention", template: "%s · Worth a Mention" },
  description: "Good things. Worth remembering.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Worth a Mention", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#0c0c0f", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
