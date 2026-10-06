"use client";

import { useEffect, useState } from "react";

type Mode = "none" | "token";

export default function Economy() {
  const [mode, setMode] = useState<Mode>("none");
  const [projectSlug, setProjectSlug] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("project");
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return;
    setProjectSlug(slug);
    setLoading(true);
    fetch("/api/project?slug=" + encodeURIComponent(slug), { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.project?.id) throw new Error(data?.error ?? "Project could not be loaded.");
        setProjectId(data.project.id);
        setProjectName(data.project.name);
        setMode(data.project.economy === "token" ? "token" : "none");
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Project could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  const saveMode = async (nextMode: Mode) => {
    setMode(nextMode);
    setMessage("");
    setError("");
    if (!projectId) return;
    setSaving(true);
    try {
      const response = await fetch("/api/project/economy", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId, mode: nextMode }),
      });
      const data = await response.json().catch(() => null);
      if (response.status === 401) {
        window.location.href = "/auth?next=" + encodeURIComponent(window.location.pathname + window.location.search);
        return;
      }
      if (!response.ok) throw new Error(data?.error ?? "Economy could not be updated.");
      setMessage(nextMode === "token" ? "Token economy selected for this project." : "Project-only economy selected.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Economy could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  const returnHref = projectSlug ? "/project?slug=" + encodeURIComponent(projectSlug) : "/launch";

  return (
    <main className="surface economy-surface">
      <header className="surface-nav">
        <a href="/" className="wordmark">EIDOLON</a>
        <nav className="surface-nav-links"><a href="/discover">Discover</a><a href="/launch">Launch</a><span>ECONOMY</span></nav>
      </header>
      <section className="economy-stage">
        <div className="economy-intro">
          <div className="eyebrow">OPTIONAL ECONOMIC LAYER</div>
          <h1>{projectName ? <>Shape<br/><em>{projectName}.</em></> : <>Give a project<br/><em>an economy.</em></>}</h1>
          <p>Economic infrastructure belongs to the project, not the other way around. A project can remain independent or enable its native economic layer.</p>
        </div>
        <div className="economy-console" aria-busy={loading || saving}>
          <div className="console-line"><span>ECONOMY MODE</span><span>{projectSlug ? "PROJECT / CONTEXT" : "PROJECT / NEW"}</span></div>
          {loading ? <div className="economy-readout"><span className="readout-dot"/><div><strong>READING PROJECT STATE</strong><p>Loading the persisted economy configuration.</p></div></div> : (
            <>
              <div className="economy-grid">
                <button type="button" className={mode === "none" ? "economy active" : "economy"} disabled={saving} onClick={() => saveMode("none")}><span className="economy-index">01</span><strong>Project only</strong><span>No token. Keep the project independent.</span><i>○</i></button>
                <button type="button" className={mode === "token" ? "economy active" : "economy"} disabled={saving} onClick={() => saveMode("token")}><span className="economy-index">02</span><strong>Project + token</strong><span>Attach a native project economy.</span><i>◇</i></button>
              </div>
              <div className="economy-readout"><span className="readout-dot"/><div><strong>{mode === "token" ? "NATIVE ECONOMY SELECTED" : "INDEPENDENT PROJECT SELECTED"}</strong><p>{mode === "token" ? "The economic mode is persisted. Token deployment, wallet ownership and chain configuration require real infrastructure before activation." : "This project remains independent. An economy can be enabled later without replacing its canonical identity."}</p></div></div>
              {message && <p className="action-note" role="status" aria-live="polite">{message}</p>}
              {error && <p className="action-error" role="alert">{error}</p>}
            </>
          )}
          <a className="primary" href={returnHref}>{projectSlug ? "Return to project" : "Continue to launch"} <span>→</span></a>
        </div>
      </section>
    </main>
  );
}
