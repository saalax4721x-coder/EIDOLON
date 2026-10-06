"use client";

import { useState } from "react";

export default function Economy() {
  const [mode, setMode] = useState<"none" | "token">("token");

  return (
    <main className="surface economy-surface">
      <header className="surface-nav">
        <a href="/" className="wordmark">EIDOLON</a>
        <nav className="surface-nav-links"><a href="/discover">Discover</a><a href="/launch">Launch</a><span>ECONOMY</span></nav>
      </header>
      <section className="economy-stage">
        <div className="economy-intro">
          <div className="eyebrow">OPTIONAL ECONOMIC LAYER</div>
          <h1>Give a project<br/><em>an economy.</em></h1>
          <p>Economic infrastructure belongs to the project, not the other way around. Start without a token, or prepare a native economy when the real infrastructure is ready.</p>
        </div>
        <div className="economy-console">
          <div className="console-line"><span>ECONOMY MODE</span><span>PROJECT / 01</span></div>
          <div className="economy-grid">
            <button className={mode === "none" ? "economy active" : "economy"} onClick={() => setMode("none")}><span className="economy-index">01</span><strong>Project only</strong><span>No token. Keep the project independent.</span><i>○</i></button>
            <button className={mode === "token" ? "economy active" : "economy"} onClick={() => setMode("token")}><span className="economy-index">02</span><strong>Project + token</strong><span>Attach a native token layer to the project.</span><i>◇</i></button>
          </div>
          <div className="economy-readout"><span className="readout-dot"/><div><strong>{mode === "token" ? "NATIVE ECONOMY SELECTED" : "INDEPENDENT PROJECT SELECTED"}</strong><p>{mode === "token" ? "Token creation will use real wallet, chain, supply and ownership infrastructure when enabled. Nothing is simulated." : "You can activate an economy later without replacing the project's canonical identity."}</p></div></div>
          <button className="primary" onClick={() => location.href="/project"}>Return to project <span>→</span></button>
        </div>
      </section>
    </main>
  );
}
