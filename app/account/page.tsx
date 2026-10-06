"use client";

import { useEffect, useState } from "react";

type SessionState = "checking" | "signed-in" | "signed-out";
type AccountProject = { id: string; name: string; slug: string; type: string; description: string | null; economy: "none" | "token"; verification_status: string; created_at: string };

export default function Account() {
  const [state, setState] = useState<SessionState>("checking");
  const [email, setEmail] = useState("");
  const [projects, setProjects] = useState<AccountProject[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (response.ok && data?.authenticated && data?.user?.email) {
          setEmail(data.user.email);
          setState("signed-in");
          const projectResponse = await fetch("/api/account/projects", { cache: "no-store" });
          const projectData = await projectResponse.json().catch(() => null);
          if (projectResponse.ok && Array.isArray(projectData?.projects)) setProjects(projectData.projects);
        } else {
          setState("signed-out");
        }
      })
      .catch(() => setState("signed-out"));
  }, []);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); } finally { window.location.href = "/"; }
  }

  return (
    <main className="info-page">
      <header className="surface-nav">
        <a href="/" className="wordmark">EIDOLON</a>
        <nav className="surface-nav-links"><a href="/discover">Discover</a><a href="/launch">Launch</a><a href="/connectors">Connectors</a><span>ACCOUNT</span></nav>
      </header>
      <section className="info-hero">
        <span className="eyebrow">IDENTITY / ACCOUNT</span>
        <h1>Your place<br/><em>in the network.</em></h1>
        <p>{state === "checking" ? "Checking your session…" : state === "signed-in" ? "Your EIDOLON session is active." : "You are not currently signed in."}</p>
      </section>
      <section className="support-note">
        {state === "signed-in" ? (
          <>
            <span className="eyebrow">SESSION ACTIVE</span>
            <h2>Identity is connected.</h2>
            <p>Signed in as <strong>{email}</strong>. Use your account to launch projects, follow projects and authorize supported connectors.</p>
            <div className="step-actions"><a className="primary" href="/launch">Launch <span>↗</span></a><button type="button" className="quiet-button" disabled={busy} onClick={logout}>{busy ? "Signing out…" : "Sign out"}</button></div>
          </>
        ) : state === "signed-out" ? (
          <>
            <span className="eyebrow">SESSION REQUIRED</span><h2>Enter the network.</h2><p>Sign in with a secure link to continue.</p><a className="primary" href="/auth?next=/account">Sign in <span>↗</span></a>
          </>
        ) : <span className="eyebrow">VERIFYING SESSION</span>}
      </section>
      {state === "signed-in" && (
        <section className="account-projects">
          <div className="section-heading"><span className="eyebrow">YOUR PROJECTS</span><span>{projects.length} {projects.length === 1 ? "PROJECT" : "PROJECTS"}</span></div>
          {projects.length === 0 ? (
            <div className="panel"><h2>Nothing launched yet.</h2><p>Your projects will appear here once you create their real EIDOLON identity.</p><a className="primary" href="/launch">Launch your first project <span>↗</span></a></div>
          ) : (
            <div className="account-project-list">
              {projects.map((project) => (
                <a className="account-project" href={"/project?slug=" + encodeURIComponent(project.slug)} key={project.id}>
                  <div><span className="eyebrow">{project.type}</span><h2>{project.name}</h2><p>{project.description || "No description."}</p></div>
                  <div className="account-project-meta"><span>{project.verification_status.toUpperCase()}</span><span>{project.economy === "token" ? "TOKEN" : "NO TOKEN"}</span><b>↗</b></div>
                </a>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
