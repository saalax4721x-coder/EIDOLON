"use client";

import { useEffect, useState } from "react";

type GithubStatus = {
  connected: boolean;
  expired?: boolean;
  login?: string;
  scopes?: string[];
  updatedAt?: string;
};

export default function Connectors() {
  const [github, setGithub] = useState<GithubStatus | null>(null);

  useEffect(() => {
    fetch("/api/connectors/github", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (response.ok) setGithub(data);
        else setGithub({ connected: false });
      })
      .catch(() => setGithub({ connected: false }));
  }, []);

  const githubConnected = github?.connected === true;

  return (
    <main className="info-page">
      <header className="surface-nav">
        <a href="/" className="wordmark">EIDOLON</a>
        <nav className="surface-nav-links">
          <a href="/discover">Discover</a><a href="/launch">Launch</a><a href="/auth">Sign in</a><span>CONNECTORS</span>
        </nav>
      </header>
      <section className="info-hero">
        <span className="eyebrow">SOURCE / PROOF / CAPABILITY</span>
        <h1>Your sources.<br/><em>Your proof.</em></h1>
        <p>Connectors establish real relationships with external systems. They are never decorative badges.</p>
      </section>

      <section className="connector-grid">
        <article className="connector-card active">
          <div>
            <span className="connector-status">{github === null ? "CHECKING" : githubConnected ? "CONNECTED" : github?.expired ? "EXPIRED" : "AVAILABLE"}</span>
            <span className="connector-mark">GH</span>
          </div>
          <h2>GitHub</h2>
          <p>Connect GitHub to prove control of supported repositories. Verification uses the real provider account and repository.</p>
          {githubConnected ? (
            <>
              <span className="connector-muted">Connected as <strong>{github.login}</strong></span>
              <span className="connector-muted">Scopes: {(github.scopes ?? []).join(", ") || "provider-managed"}</span>
            </>
          ) : github?.expired ? (
            <a className="connector-muted" href="/auth?next=/connectors">Reconnect GitHub →</a>
          ) : (
            <a className="connector-muted" href="/auth?next=/launch">Sign in to continue →</a>
          )}
        </article>

        <article className="connector-card">
          <div><span className="connector-status">COMING LATER</span><span className="connector-mark">◎</span></div>
          <h2>Domains</h2>
          <p>Domain ownership proof will arrive through a real DNS or equivalent verification rail. Nothing is simulated today.</p>
          <span className="connector-muted">Not connected</span>
        </article>
        <article className="connector-card">
          <div><span className="connector-status">COMING LATER</span><span className="connector-mark">◈</span></div>
          <h2>Wallets</h2>
          <p>Wallet connections will establish control of supported on-chain assets. Never enter a private key or recovery phrase into EIDOLON.</p>
          <span className="connector-muted">Not connected</span>
        </article>
        <article className="connector-card">
          <div><span className="connector-status">COMING LATER</span><span className="connector-mark">◇</span></div>
          <h2>Platforms</h2>
          <p>App stores, games and brokerages require their own authorization and policy rails before they can be represented as connected.</p>
          <span className="connector-muted">Not connected</span>
        </article>
      </section>

      <section className="support-note">
        <span className="eyebrow">THE RULE</span>
        <h2>Connection is evidence, not decoration.</h2>
        <p>A connector should only unlock claims that its underlying provider can actually prove.</p>
      </section>
    </main>
  );
}
