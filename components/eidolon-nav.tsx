"use client";

import { useEffect, useRef, useState } from "react";
import { EidolonIcon } from "@/components/eidolon-icon";

export function EidolonNav({ section }: { section?: string }) {
  const [open, setOpen] = useState(false);
  const commandButtonRef = useRef<HTMLButtonElement>(null);
  const commandDialogRef = useRef<HTMLElement>(null);
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open) {
      commandDialogRef.current?.querySelector<HTMLElement>("a[href]")?.focus();
    } else if (wasOpenRef.current) {
      commandButtonRef.current?.focus();
    }
    wasOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen((value) => !value); }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <nav className="eidolon-nav" aria-label="Primary navigation">
      <a href="/" className="eidolon-nav-brand" aria-label="EIDOLON home">
        <span className="brand-glyph">E</span><span>EIDOLON</span>
      </a>
      <div className="eidolon-nav-center">
        <a className={section === "discover" ? "active" : ""} href="/discover"><EidolonIcon name="discover" size={14}/>Discover</a>
        <a className={section === "graph" ? "active" : ""} href="/graph"><EidolonIcon name="graph" size={14}/>Graph</a>
        <a className={section === "launch" ? "active" : ""} href="/launch"><EidolonIcon name="launch" size={14}/>Launch</a>
        <a className={section === "economy" ? "active" : ""} href="/economy"><EidolonIcon name="economy" size={14}/>Economy</a>
        <a className={section === "connectors" ? "active" : ""} href="/connectors"><EidolonIcon name="verified" size={14}/>Connect</a>
      </div>
      <div className="eidolon-nav-actions">
        <button ref={commandButtonRef} type="button" className="eidolon-nav-command" onClick={() => setOpen(true)} aria-label="Open command menu" aria-haspopup="dialog" aria-expanded={open}><span>COMMAND</span><kbd>⌘K</kbd></button>
        <a className="eidolon-nav-icon" href="/help" aria-label="Help">?</a>
        <a className="eidolon-nav-signin" href="/auth">Sign in <span>↗</span></a>
      </div>
      {open && <div className="eidolon-command-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <section ref={commandDialogRef} className="eidolon-command" role="dialog" aria-modal="true" aria-label="EIDOLON command menu" onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const items = commandDialogRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
          if (!items?.length) return;
          const first = items[0];
          const last = items[items.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }}>
          <div className="eidolon-command-head"><div><span>CONTROL / COMMAND</span><strong>Navigate the network.</strong></div><button type="button" onClick={() => setOpen(false)} aria-label="Close command menu">ESC</button></div>
          <div className="eidolon-command-grid">
            <a href="/discover" onClick={() => setOpen(false)}><EidolonIcon name="discover" size={18}/><span><b>Discover</b><small>Find projects and objects</small></span><i>↗</i></a>
            <a href="/graph" onClick={() => setOpen(false)}><EidolonIcon name="graph" size={18}/><span><b>Graph</b><small>Inspect recorded relationships</small></span><i>↗</i></a>
            <a href="/launch" onClick={() => setOpen(false)}><EidolonIcon name="launch" size={18}/><span><b>Launch</b><small>Create a new object</small></span><i>↗</i></a>
            <a href="/economy" onClick={() => setOpen(false)}><EidolonIcon name="economy" size={18}/><span><b>Economy</b><small>Shape a project's economic layer</small></span><i>↗</i></a>
            <a href="/connectors" onClick={() => setOpen(false)}><EidolonIcon name="verified" size={18}/><span><b>Connect</b><small>Link GitHub and wallets</small></span><i>↗</i></a>
            <a href="/help" onClick={() => setOpen(false)}><EidolonIcon name="project" size={18}/><span><b>Help</b><small>Understand EIDOLON</small></span><i>↗</i></a>
          </div>
          <div className="eidolon-command-foot"><span>OBJECT NETWORK</span><span>ESC CLOSES</span></div>
        </section>
      </div>}
    </nav>
  );
}
