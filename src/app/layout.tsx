import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deeda | Make room for your next good idea",
  description:
    "A thoughtful AI chat workspace for questions, conversations, and visible token usage.",
};

export const viewport: Viewport = {
  themeColor: "#34205f",
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
