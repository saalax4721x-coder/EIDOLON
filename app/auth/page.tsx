"use client";

import { FormEvent, useState } from "react";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const next = new URLSearchParams(window.location.search).get("next") ?? "/launch";
    const response = await fetch("/api/auth/request-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, next }),
    });
    if (!response.ok) {
      setError((await response.json()).error ?? "Unable to send sign-in link.");
      return;
    }
    setSent(true);
  }

  return (
    <main className="surface">
      <header className="surface-nav"><a href="/" className="wordmark">EIDOLON</a><span>IDENTITY</span></header>
      <section className="launch-panel">
        <div className="eyebrow">IDENTITY / ACCESS</div>
        <h1>Enter the<br/><em>network.</em></h1>
        {sent ? <p className="auth-message">A secure sign-in link is on its way. Open it on this device to continue.</p> : (
          <form className="form" onSubmit={submit}>
            <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"/></label>
            <button className="primary" type="submit">Send sign-in link</button>
            {error && <p className="auth-error">{error}</p>}
          </form>
        )}
      </section>
    </main>
  );
}
