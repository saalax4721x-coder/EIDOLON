"use client";

import { useMemo, useState } from "react";
import { projectTypes, type ProjectType, type EconomyMode } from "@/lib/eidolon";
import { emptyProjectDraft, projectDraftIsReady } from "@/lib/project-draft";
import { EidolonIcon, type EidolonIconName } from "@/components/eidolon-icon";

const steps = ["THE OBJECT", "IDENTITY", "ECONOMY"];
const typeIcons: Record<string, EidolonIconName> = {
  "Website": "use", "Web app": "use", "App": "use", "API": "graph",
  "GitHub project": "build", "Game": "project", "AI product": "discover",
  "Dataset": "graph", "Protocol": "economy", "Digital asset": "commerce",
  "Creator / business": "commerce",
};

function sourceHint(type: ProjectType | "" | null) {
  if (type === "GitHub project") return "Use a GitHub repository URL or owner/repository.";
  if (type && ["Website", "Web app", "App", "API"].includes(type)) return "Use the live HTTP(S) URL for the underlying project.";
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

  if (published) return <main className="surface launch-complete"><div className="launch-complete-sigil"><EidolonIcon name="verified" size={34}/></div><div className="panel success"><span className="eyebrow">PROJECT CREATED</span><h1>Your project has a place in EIDOLON.</h1><p>The project identity is now persisted. Source verification remains pending until the underlying source is actually verified.</p><div className="step-actions">{createdSlug && <a className="primary" href={`/project?slug=${encodeURIComponent(createdSlug)}`}>Open project <span>↗</span></a>}<a className="quiet-button" href="/discover">Enter discovery →</a></div></div></main>;

  return <main className="surface launch-universe">
    <header className="surface-nav">
      <a href="/" className="wordmark">EIDOLON</a>
      <nav className="surface-nav-links"><a href="/discover">Discover</a><span>LAUNCH</span></nav>
    </header>
    <div className="launch-constellation" aria-hidden="true"><span/><span/><span/><i/></div>
    <section className="launch-panel launch-experience">
      <div className="launch-progress"><span>LAUNCH SEQUENCE</span><div>{steps.map((label, index) => <button key={label} className={index === step ? "progress-step active" : index < step ? "progress-step complete" : "progress-step"} onClick={() => index <= step && setStep(index)}><b>{String(index + 1).padStart(2, "0")}</b><small>{label}</small></button>)}</div></div>
      {step === 0 && <><div className="launch-stage-head"><div><div className="eyebrow">01 / THE OBJECT</div><h1>What are you bringing<br/><em>into the world?</em></h1></div><div className="launch-oracle"><EidolonIcon name={typeIcons[draft.type] ?? "project"} size={42}/><span>{draft.type ? "OBJECT SELECTED" : "SELECT AN OBJECT"}</span></div></div><div className="type-grid">{projectTypes.map((x) => <button className={draft.type === x ? "choice active" : "choice"} onClick={() => update({ type: x as ProjectType })} key={x}><span className="choice-icon"><EidolonIcon name={typeIcons[x] ?? "project"} size={19}/></span><span className="choice-copy"><b>{x}</b><small>{draft.type === x ? "SELECTED / READY" : "ADD TO THE NETWORK"}</small></span><span className="choice-arrow">↗</span></button>)}</div><button className="primary" disabled={!draft.type} onClick={() => setStep(1)}>Continue <span>→</span></button></>}
      {step === 1 && <><div className="launch-stage-head"><div><div className="eyebrow">02 / IDENTITY</div><h1>Give it a<br/><em>presence.</em></h1></div><div className="launch-oracle"><EidolonIcon name="verified" size={42}/><span>SOURCE WILL BE VERIFIED</span></div></div><div className="form"><label>Project name<input maxLength={120} value={draft.name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. NOVA"/></label><label>Source / website<input maxLength={1000} value={draft.source} onChange={(e) => update({ source: e.target.value })} placeholder="https:// or source identifier"/><small className="field-hint">{sourceHint(draft.type)}</small></label><label>One sentence<textarea maxLength={4000} value={draft.description} onChange={(e) => update({ description: e.target.value })} placeholder="What is this project?" rows={3}/></label></div><div className="step-actions"><button className="quiet-button" onClick={() => setStep(0)}>Back</button><button className="primary" disabled={!ready} onClick={() => setStep(2)}>Continue <span>→</span></button></div></>}
      {step === 2 && <><div className="launch-stage-head"><div><div className="eyebrow">03 / ECONOMY</div><h1>With an economy<br/><em>or without one?</em></h1></div><div className="launch-oracle"><EidolonIcon name="economy" size={42}/><span>OPTIONAL / NEVER SIMULATED</span></div></div><div className="economy-grid"><button className={draft.economy === "none" ? "economy active" : "economy"} onClick={() => update({ economy: "none" as EconomyMode })}><span className="economy-index">01</span><strong>No token</strong><span>Launch the project on its own.</span><i>○</i></button><button className={draft.economy === "token" ? "economy active" : "economy"} onClick={() => update({ economy: "token" as EconomyMode })}><span className="economy-index">02</span><strong>With a token</strong><span>Prepare a native project economy.</span><i>◇</i></button></div>{draft.economy === "token" && <div className="token-note">Real wallet/chain infrastructure will power deployment — never simulated.</div>}{error && <p className="auth-error">{error}</p>}<div className="step-actions"><button className="quiet-button" onClick={() => setStep(1)}>Back</button><button className="primary" disabled={!ready || publishing} onClick={prepare}>{publishing ? "Creating…" : "Create project"} <span>↗</span></button></div></>}
    </section>
  </main>;
}
