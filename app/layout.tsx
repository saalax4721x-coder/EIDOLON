import type { Metadata } from "next";
import "./globals.css";
import SessionKeeper from "./session-keeper";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "EIDOLON",
  description: "A home for your projects. A workspace for your company, agents and workflows.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#page-content">Skip to content</a>
        <SessionKeeper />
        <div id="page-content" tabIndex={-1}>{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
