"use client";

import { useMemo, useState } from "react";
import { projectTypes, type ProjectType, type EconomyMode } from "@/lib/eidolon";
import { emptyProjectDraft, projectDraftIsReady } from "@/lib/project-draft";

const steps = ["THE OBJECT", "IDENTITY", "ECONOMY"];

function sourceHint(type: ProjectType | "") {
  if (type === "GitHub project") return "Use a GitHub repository URL or owner/repository.";
  if (["Website", "Web app", "App", "API"].includes(type)) return "Use the live HTTP(S) URL for the underlying project.";
  return "Use the underlying source, identifier or URL. Verification comes later.";
}

export default function Launch() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(emptyProjectDraft);
  const [published, setPublished] = useState(false);
  const [createdSlug, setCreatedSlug] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const ready = useMemo(() => projectDraftIsReady(draft), [draft]);
  const update = (patch: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...patch }));

  async function prepare() {
    if (publishing) return;
    setError("");
    setPublishing(true);
    try {
      const response = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
      if (response.status === 401) { window.location.href = "/auth?next=/launch"; return; }
      const data = await response.json();
      if (!response.ok) { setError(data.error ?? "Unable to create the project."); return; }
      setCreatedSlug(data.project?.slug ?? "");
      setPublished(true);
    } catch {
      setError("The network could not be reached. Nothing was simulated.");
    } finally {
      setPublishing(false);
    }
  }

  if (published) return <main className="surface"><div className="panel success"><span className="eyebrow">PROJECT CREATED</span><h1>Your project has a place in EIDOLON.</h1><p>The project identity is now persisted. Source verification remains pending until the underlying source is actually verified.</p><div className="step-actions">{createdSlug && <a className="primary" href={`/project?slug=${encodeURIComponent(createdSlug)}`}>Open project <span>↗</span></a>}<a className="quiet-button" href="/discover">Enter discovery →</a></div></div></main>;

  return <main className="surface">
    <header className="surface-nav">
      <a href="/" className="wordmark">EIDOLON</a>
      <nav className="surface-nav-links"><a href="/discover">Discover</a><span>LAUNCH</span></nav>
    </header>
    <section className="launch-panel launch-experience">
      <div className="launch-progress"><span>LAUNCH SEQUENCE</span><div>{steps.map((label, index) => <button key={label} className={index === step ? "progress-step active" : index < step ? "progress-step complete" : "progress-step"} onClick={() => index <= step && setStep(index)}><b>{String(index + 1).padStart(2, "0")}</b><small>{label}</small></button>)}</div></div>
      {step === 0 && <><div className="eyebrow">01 / THE OBJECT</div><h1>What are you bringing<br/><em>into the world?</em></h1><div className="type-grid">{projectTypes.map((x) => <button className={draft.type === x ? "choice active" : "choice"} onClick={() => update({ type: x as ProjectType })} key={x}>{x}<span>↗</span></button>)}</div><button className="primary" disabled={!draft.type} onClick={() => setStep(1)}>Continue <span>→</span></button></>}
      {step === 1 && <><div className="eyebrow">02 / IDENTITY</div><h1>Give it a<br/><em>presence.</em></h1><div className="form"><label>Project name<input maxLength={120} value={draft.name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. NOVA"/></label><label>Source / website<input maxLength={1000} value={draft.source} onChange={(e) => update({ source: e.target.value })} placeholder="https:// or source identifier"/><small className="field-hint">{sourceHint(draft.type)}</small></label><label>One sentence<textarea maxLength={4000} value={draft.description} onChange={(e) => update({ description: e.target.value })} placeholder="What is this project?" rows={3}/></label></div><div className="step-actions"><button className="quiet-button" onClick={() => setStep(0)}>Back</button><button className="primary" disabled={!ready} onClick={() => setStep(2)}>Continue <span>→</span></button></div></>}
      {step === 2 && <><div className="eyebrow">03 / ECONOMY</div><h1>With an economy<br/><em>or without one?</em></h1><div className="economy-grid"><button className={draft.economy === "none" ? "economy active" : "economy"} onClick={() => update({ economy: "none" as EconomyMode })}><span className="economy-index">01</span><strong>No token</strong><span>Launch the project on its own.</span><i>○</i></button><button className={draft.economy === "token" ? "economy active" : "economy"} onClick={() => update({ economy: "token" as EconomyMode })}><span className="economy-index">02</span><strong>With a token</strong><span>Prepare a native project economy.</span><i>◇</i></button></div>{draft.economy === "token" && <div className="token-note">Real wallet/chain infrastructure will power deployment — never simulated.</div>}{error && <p className="auth-error">{error}</p>}<div className="step-actions"><button className="quiet-button" onClick={() => setStep(1)}>Back</button><button className="primary" disabled={!ready || publishing} onClick={prepare}>{publishing ? "Creating…" : "Create project"} <span>↗</span></button></div></>}
    </section>
  </main>;
}
