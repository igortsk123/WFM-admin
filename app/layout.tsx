import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "WFM Admin",
  description: "Workforce Management Administration Panel",
};

export const viewport: Viewport = {
  themeColor: "#6738DD",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
