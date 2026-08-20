import type { Metadata, Viewport } from "next";
import { GAME_TAGLINE, GAME_TITLE } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: GAME_TITLE,
  description: GAME_TAGLINE,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
