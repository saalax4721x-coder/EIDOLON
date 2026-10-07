"use client";

import { useState } from "react";
import { EidolonIcon, type EidolonIconName } from "@/components/eidolon-icon";

const intents = [
  { id: "launch", label: "Launch something", detail: "Bring a project into the world.", icon: "launch" as EidolonIconName },
  { id: "discover", label: "Discover projects", detail: "Find what people are building.", icon: "discover" as EidolonIconName },
  { id: "build", label: "Build & collaborate", detail: "Find people, projects and open work.", icon: "build" as EidolonIconName },
  { id: "commerce", label: "Buy / sell", detail: "Find products, assets and services.", icon: "commerce" as EidolonIconName },
  { id: "fund", label: "Fund a project", detail: "Support something worth building.", icon: "fund" as EidolonIconName },
  { id: "use", label: "Use something", detail: "Find an API, app, game or service.", icon: "use" as EidolonIconName },
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
              <span className={`intent-mark intent-mark-${item.id}`}><EidolonIcon name={item.icon} size={22} /></span>
              <span className="intent-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>
              <span className="arrow">↗</span>
            </button>
          ))}
        </div>
        <section className="landing-intelligence" aria-label="How EIDOLON works">
          <div className="landing-intelligence-head">
            <span className="eyebrow">THE EIDOLON MODEL</span>
            <h2>Things become more useful<br/><em>when they become objects.</em></h2>
            <p>Every project can carry a source, capabilities, relationships and an optional economy. EIDOLON turns that structure into something you can discover, understand and act on.</p>
          </div>
          <div className="landing-primitives">
            <article><span className="landing-primitive-index">01</span><EidolonIcon name="project" size={20}/><strong>OBJECT</strong><p>A project has an identity instead of being just another link.</p></article>
            <article><span className="landing-primitive-index">02</span><EidolonIcon name="verified" size={20}/><strong>PROOF</strong><p>Sources and verification separate what is known from what is claimed.</p></article>
            <article><span className="landing-primitive-index">03</span><EidolonIcon name="graph" size={20}/><strong>NETWORK</strong><p>Real persisted relationships reveal how projects actually connect.</p></article>
            <article><span className="landing-primitive-index">04</span><EidolonIcon name="commerce" size={20}/><strong>ACTION</strong><p>Use, fund, buy, license, contribute and compose when capability exists.</p></article>
          </div>
        </section>
        <section className="landing-loop" aria-label="EIDOLON network loop">
          <span className="eyebrow">THE NETWORK LOOP</span>
          <div className="landing-loop-track">
            <span>DISCOVER</span><i>→</i><span>VERIFY</span><i>→</i><span>UNDERSTAND</span><i>→</i><span>CONNECT</span><i>→</i><span>USE</span><i>→</i><span>BUILD</span><i>→</i><span>LAUNCH</span>
          </div>
        </section>
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
