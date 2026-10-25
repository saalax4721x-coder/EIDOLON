import type { Metadata } from "next";
import "./globals.css";
import SessionKeeper from "./session-keeper";
import { WorkspaceFrame } from "@/components/workspace-frame";

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
        <div id="application-root"><WorkspaceFrame>{children}</WorkspaceFrame></div>
      </body>
    </html>
  );
}
