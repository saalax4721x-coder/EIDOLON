"use client";

import { FormEvent, useState } from "react";
import { EidolonIcon } from "@/components/eidolon-icon";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const next = new URLSearchParams(window.location.search).get("next") || "/launch";
      const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/launch";
      const response = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, next: safeNext }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof data.error === "string" ? data.error : "Unable to send sign-in link.");
        return;
      }
      setSent(true);
    } catch {
      setError("The network could not be reached. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="surface identity-surface">
      <header className="surface-nav">
        <a href="/" className="wordmark">EIDOLON</a>
        <nav className="surface-nav-links"><a href="/discover">Discover</a><a href="/launch">Launch</a><span>IDENTITY</span></nav>
      </header>
      <section className="identity-stage">
        <div className="identity-orbit" aria-hidden="true"><span/><span/><span/></div>
        <div className="identity-copy"><div className="threshold-mark"><EidolonIcon name="verified" size={32} /></div>
          <div className="eyebrow">IDENTITY / ACCESS</div>
          <h1>Enter the<br/><em>network.</em></h1>
          <p>One secure link. No password to remember. Your identity stays attached to the projects, follows and proofs you create.</p>
        </div>
        <div className="identity-card">
          <div className="identity-card-top"><span><EidolonIcon name="verified" size={12} /> SECURE ACCESS</span><span>01 / THRESHOLD</span></div>
          {sent ? (
            <div className="identity-sent">
              <div className="signal-ring">✓</div>
              <div><span className="eyebrow">LINK SENT</span><h2>Check your inbox.</h2><p>A secure sign-in link is on its way. Open it on this device to continue.</p></div>
              <button className="quiet-button" onClick={() => { setSent(false); setError(""); }}>Use another email</button>
            </div>
          ) : (
            <form className="form" onSubmit={submit}>
              <label>Email<input autoComplete="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"/></label>
              <button className="primary" type="submit" disabled={busy}>{busy ? "Sending…" : "Send secure link"} <span>↗</span></button>
              {error && <p className="auth-error" role="alert">{error}</p>}
            </form>
          )}
          <div className="identity-foot"><span>PKCE protected</span><span>NO PASSWORD</span></div>
        </div>
      </section>
    </main>
  );
}
