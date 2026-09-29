import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LiteChat | Model access, made simple",
  description:
    "A text-first chat prototype for selecting LiteChat proxy routes and reviewing token usage.",
};

export const viewport: Viewport = {
  themeColor: "#172225",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
