"use client";
import { useMemo, useState } from "react";
import { projectTypes, type ProjectType, type EconomyMode } from "@/lib/eidolon";
import { emptyProjectDraft, projectDraftIsReady } from "@/lib/project-draft";

export default function Launch() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(emptyProjectDraft);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState("");
  const ready = useMemo(() => projectDraftIsReady(draft), [draft]);
  const update = (patch: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...patch }));

  async function prepare() {
    setError("");
    const response = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
    if (response.status === 401) { window.location.href = "/auth?next=/launch"; return; }
    if (!response.ok) { setError((await response.json()).error ?? "Unable to create the project."); return; }
    setPublished(true);
  }

  if (published) return <main className="surface"><div className="panel success"><span className="eyebrow">PROJECT CREATED</span><h1>Your project has a place in EIDOLON.</h1><p>The project identity is now persisted. Source verification remains pending until the underlying source is actually verified.</p><a href="/discover">Enter discovery →</a></div></main>;

  return <main className="surface">
    <header className="surface-nav"><a href="/" className="wordmark">EIDOLON</a><span>LAUNCH / {String(step + 1).padStart(2, "0")} — 03</span></header>
    <section className="launch-panel">
      {step === 0 && <><div className="eyebrow">01 / THE OBJECT</div><h1>What are you bringing<br/><em>into the world?</em></h1><div className="type-grid">{projectTypes.map((x) => <button className={draft.type === x ? "choice active" : "choice"} onClick={() => update({ type: x as ProjectType })} key={x}>{x}<span>↗</span></button>)}</div><button className="primary" disabled={!draft.type} onClick={() => setStep(1)}>Continue</button></>}
      {step === 1 && <><div className="eyebrow">02 / IDENTITY</div><h1>Give it a<br/><em>presence.</em></h1><div className="form"><label>Project name<input value={draft.name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. NOVA"/></label><label>Source / website<input value={draft.source} onChange={(e) => update({ source: e.target.value })} placeholder="https:// or source identifier"/></label><label>One sentence<textarea value={draft.description} onChange={(e) => update({ description: e.target.value })} placeholder="What is this project?" rows={3}/></label></div><button className="primary" disabled={!ready} onClick={() => setStep(2)}>Continue</button></>}
      {step === 2 && <><div className="eyebrow">03 / ECONOMY</div><h1>With an economy<br/><em>or without one?</em></h1><div className="economy-grid"><button className={draft.economy === "none" ? "economy active" : "economy"} onClick={() => update({ economy: "none" as EconomyMode })}><strong>No token</strong><span>Launch the project on its own.</span></button><button className={draft.economy === "token" ? "economy active" : "economy"} onClick={() => update({ economy: "token" as EconomyMode })}><strong>With a token</strong><span>Prepare a native project economy.</span></button></div>{draft.economy === "token" && <div className="token-note">Real wallet/chain infrastructure will power deployment — never simulated.</div>}{error && <p className="auth-error">{error}</p>}<button className="primary" disabled={!ready} onClick={prepare}>Create project</button></>}
    </section>
  </main>;
}
