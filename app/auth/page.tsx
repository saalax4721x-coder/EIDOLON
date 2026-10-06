"use client";

import { FormEvent, useState } from "react";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/auth/request-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      setError((await response.json()).error ?? "Unable to send sign-in link.");
      return;
    }
    setSent(true);
  }

  return (
    <main className="surface identity-surface">
      <header className="surface-nav">
        <a href="/" className="wordmark">EIDOLON</a>
        <nav className="surface-nav-links"><a href="/discover">Discover</a><a href="/launch">Launch</a><span>IDENTITY</span></nav>
      </header>
      <section className="identity-stage">
        <div className="identity-orbit" aria-hidden="true"><span/><span/><span/></div>
        <div className="identity-copy">
          <div className="eyebrow">IDENTITY / ACCESS</div>
          <h1>Enter the<br/><em>network.</em></h1>
          <p>One secure link. No password to remember. Your identity stays attached to the projects, follows and proofs you create.</p>
        </div>
        <div className="identity-card">
          <div className="identity-card-top"><span>SECURE ACCESS</span><span>01</span></div>
          {sent ? (
            <div className="identity-sent">
              <div className="signal-ring">✓</div>
              <div><span className="eyebrow">LINK SENT</span><h2>Check your inbox.</h2><p>A secure sign-in link is on its way. Open it on this device to continue.</p></div>
              <button className="quiet-button" onClick={() => setSent(false)}>Use another email</button>
            </div>
          ) : (
            <form className="form" onSubmit={submit}>
              <label>Email<input autoComplete="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"/></label>
              <button className="primary" type="submit">Send secure link <span>↗</span></button>
              {error && <p className="auth-error">{error}</p>}
            </form>
          )}
          <div className="identity-foot"><span>PKCE protected</span><span>NO PASSWORD</span></div>
        </div>
      </section>
    </main>
  );
}
