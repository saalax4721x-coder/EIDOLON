"use client";

import { FormEvent, useEffect, useState } from "react";
import { EidolonIcon } from "@/components/eidolon-icon";
import { safeAuthNext } from "@/lib/auth-redirect";
import { EidolonNav } from "@/components/eidolon-nav";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "invalid_link") setError("This sign-in link expired, was already used, or was opened in a different browser. Request a new link and open it in the same browser.");
    const controller = new AbortController();
    void fetch("/api/auth/session", { cache: "no-store", signal: controller.signal }).then(async response => {
      const session = await response.json();
      if (response.ok && session.authenticated && !controller.signal.aborted) window.location.replace(safeAuthNext(new URLSearchParams(window.location.search).get("next")));
    }).catch(() => { /* The sign-in form remains available during a session-check outage. */ });
    return () => controller.abort();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const next = new URLSearchParams(window.location.search).get("next") || "/workspace";
      const safeNext = safeAuthNext(next);
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
      <header className="surface-nav"><EidolonNav /></header>
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
              <div role="status"><span className="eyebrow">WELCOME TO EIDOLON</span><h2>Check your inbox.</h2><p>We requested a secure link for <strong>{email}</strong>. Open the newest email in this same browser to continue. Check spam if it has not arrived.</p><p className="auth-note">The link works once and expires shortly. Requesting another link replaces the earlier request in this browser.</p></div>
              <button className="quiet-button" onClick={() => { setSent(false); setError(""); }}>Use another email</button>
            </div>
          ) : (
            <form className="form" onSubmit={submit} aria-busy={busy}>
              <label>Email<input autoComplete="email" type="email" maxLength={320} required aria-invalid={Boolean(error)} aria-describedby={error ? "auth-error auth-help" : "auth-help"} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"/></label>
              <p id="auth-help" className="auth-note">New here? The same secure email flow creates your account. No password needed.</p>
              <button className="primary" type="submit" disabled={busy}>{busy ? "Sending…" : "Send secure link"} <span>↗</span></button>
              {error && <p id="auth-error" className="auth-error" role="alert">{error}</p>}
            </form>
          )}
          <div className="identity-foot"><span>PKCE protected</span><span>NO PASSWORD</span></div>
          <p className="auth-legal">Before continuing, read the <a href="/terms">terms of service</a>, <a href="/privacy">privacy notice</a> and <a href="/cookies">cookie information</a>.</p>
        </div>
      </section>
    </main>
  );
}
