import { EidolonIcon } from "@/components/eidolon-icon";

export function EidolonNav({ section }: { section?: string }) {
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
        <a className="eidolon-nav-icon" href="/help" aria-label="Help">?</a>
        <a className="eidolon-nav-signin" href="/auth">Sign in <span>↗</span></a>
      </div>
    </nav>
  );
}
