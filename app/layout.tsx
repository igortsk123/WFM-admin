import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WFM Admin",
  description: "Workforce Management Administration Panel",
};

export const viewport: Viewport = {
  themeColor: "#6738DD",
  width: "device-width",
  initialScale: 1,
};

// Root layout shell — locale-specific rendering happens in app/[locale]/layout.tsx
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
