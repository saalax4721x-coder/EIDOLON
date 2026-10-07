import type { SVGProps } from "react";

export type EidolonIconName =
  | "launch"
  | "discover"
  | "build"
  | "commerce"
  | "fund"
  | "use"
  | "project"
  | "verified"
  | "economy"
  | "graph";

const paths: Record<EidolonIconName, React.ReactNode> = {
  launch: <><path d="M5 19 19 5"/><path d="M9 5h10v10"/><path d="M5 12v7h7"/></>,
  discover: <><circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4 4"/><path d="M8 10.5h5M10.5 8v5"/></>,
  build: <><path d="m7 17 10-10"/><path d="m5 9 4-4 10 10-4 4z"/><path d="M4 20h16"/></>,
  commerce: <><path d="M4 7h16l-2 12H6L4 7Z"/><path d="M8 7a4 4 0 0 1 8 0"/><path d="M9 12h6"/></>,
  fund: <><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"/><path d="M12 8v6M9.5 11.5h5"/></>,
  use: <><circle cx="12" cy="12" r="8"/><path d="m10 8 5 4-5 4V8Z"/></>,
  project: <><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8M8 12h5M8 16h8"/></>,
  verified: <><path d="m5 12 4 4 10-10"/><circle cx="12" cy="12" r="9"/></>,
  economy: <><circle cx="12" cy="12" r="8"/><path d="M12 7v10M15 9.5c-.7-1-1.7-1.5-3-1.5-1.7 0-3 1-3 2.4 0 3.1 6 1.4 6 4.4 0 1.3-1.2 2.2-3 2.2-1.4 0-2.5-.5-3.2-1.5"/></>,
  graph: <><circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="m8 11 8-4M8 13l8 4"/></>,
};

export function EidolonIcon({ name, size = 22, ...props }: SVGProps<SVGSVGElement> & { name: EidolonIconName }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {paths[name]}
    </svg>
  );
}
