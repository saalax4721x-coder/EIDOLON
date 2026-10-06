import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EIDOLON",
  description: "The discovery and economic layer for things people build.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}