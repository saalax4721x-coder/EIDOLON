"use client";

import { useState } from "react";

const intents = [
  { id: "launch", label: "Launch something", detail: "Bring a project into the world.", mark: "↗" },
  { id: "discover", label: "Discover projects", detail: "Find what people are building.", mark: "◌" },
  { id: "build", label: "Build & collaborate", detail: "Find people, projects and open work.", mark: "⌁" },
  { id: "commerce", label: "Buy / sell", detail: "Find products, assets and services.", mark: "◇" },
  { id: "fund", label: "Fund a project", detail: "Support something worth building.", mark: "✦" },
  { id: "use", label: "Use something", detail: "Find an API, app, game or service.", mark: "→" },
];

export default function Home() {
  const [intent, setIntent] = useState<string | null>(null);
  return (
    <main className="shell">
      <nav className="topbar">
        <div className="brand"><span className="brand-glyph">E</span><span>EIDOLON</span></div>
        <div className="topbar-right">
          <a href="/discover">Discover</a>
          <a href="/launch">Launch</a>
          <span className="status-dot" /> Network forming
        </div>
      </nav>
      <section className="hero">
        <div className="hero-atmosphere" aria-hidden="true"><span className="hero-orbit orbit-a"/><span className="hero-orbit orbit-b"/><span className="hero-orbit orbit-c"/><i className="hero-axis"/><b className="hero-node node-a"/><b className="hero-node node-b"/></div>
        <div className="hero-index" aria-hidden="true"><span>01</span><i/><span>06</span></div>
        <div className="eyebrow">THE WORLD OF THINGS BEING BUILT</div>
        <h1>What are you<br /><em>here to do?</em></h1>
        <p className="lede">EIDOLON keeps the surface simple. Tell us your intention and the world behind it will unfold.</p>
        <div className="intent-grid">
          {intents.map((item) => (
            <button key={item.id} className={`intent-card ${intent === item.id ? "selected" : ""}`}
              onClick={() => { setIntent(item.id); window.location.href = item.id === "launch" ? "/launch" : item.id === "discover" ? "/discover" : `/discover?intent=${item.id}`; }} type="button">
              <span className="intent-mark">{item.mark}</span>
              <span className="intent-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>
              <span className="arrow">↗</span>
            </button>
          ))}
        </div>
        <div className="hero-footerline">
          <span>PROJECTS / SOURCES / PEOPLE / ECONOMIES</span>
          <span>Projects can launch with or without their own economy.</span>
          {intent && <span className="selected-intent">Selected · {intents.find((i) => i.id === intent)?.label}</span>}
        </div>
      </section>
      <footer><span>EIDOLON / 001</span><span>Launch anything. Discover everything.</span><nav className="footer-links"><a href="/help">Help</a><a href="/faq">FAQ</a><a href="/connectors">Connectors</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/auth">Sign in</a></nav><span>THE NETWORK IS FORMING</span></footer>
    </main>
  );
}
