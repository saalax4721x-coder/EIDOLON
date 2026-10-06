"use client";
import { useMemo, useState } from "react";
import { projectTypes, type ProjectType, type EconomyMode } from "@/lib/eidolon";
import { emptyProjectDraft, projectDraftIsReady } from "@/lib/project-draft";

export default function Launch() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(emptyProjectDraft);
  const [published, setPublished] = useState(false);

  const ready = useMemo(() => projectDraftIsReady(draft), [draft]);
  const update = (patch: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...patch }));

  if (published) return (
    <main className="surface">
      <div className="panel success">
        <span className="eyebrow">PROJECT DRAFT READY</span>
        <h1>Your project has a place in EIDOLON.</h1>
        <p>Launch identity is captured. Persistence and source verification will attach to the real project record in the production data layer.</p>
        <a href="/discover">Enter discovery →</a>
      </div>
    </main>
  );

  return (
    <main className="surface">
      <header className="surface-nav"><a href="/" className="wordmark">EIDOLON</a><span>LAUNCH / {String(step + 1).padStart(2, "0")} — 03</span></header>
      <section className="launch-panel">
        {step === 0 && <>
          <div className="eyebrow">01 / THE OBJECT</div>
          <h1>What are you bringing<br/><em>into the world?</em></h1>
          <div className="type-grid">{projectTypes.map((x) =>
            <button className={draft.type === x ? "choice active" : "choice"} onClick={() => update({ type: x as ProjectType })} key={x}>{x}<span>↗</span></button>
          )}</div>
          <button className="primary" disabled={!draft.type} onClick={() => setStep(1)}>Continue</button>
        </>}

        {step === 1 && <>
          <div className="eyebrow">02 / IDENTITY</div>
          <h1>Give it a<br/><em>presence.</em></h1>
          <div className="form">
            <label>Project name<input value={draft.name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. NOVA"/></label>
            <label>Source / website<input value={draft.source} onChange={(e) => update({ source: e.target.value })} placeholder="https:// or source identifier"/></label>
            <label>One sentence<textarea value={draft.description} onChange={(e) => update({ description: e.target.value })} placeholder="What is this project?" rows={3}/></label>
          </div>
          <button className="primary" disabled={!ready} onClick={() => setStep(2)}>Continue</button>
        </>}

        {step === 2 && <>
          <div className="eyebrow">03 / ECONOMY</div>
          <h1>With an economy<br/><em>or without one?</em></h1>
          <div className="economy-grid">
            <button className={draft.economy === "none" ? "economy active" : "economy"} onClick={() => update({ economy: "none" as EconomyMode })}><strong>No token</strong><span>Launch the project on its own.</span></button>
            <button className={draft.economy === "token" ? "economy active" : "economy"} onClick={() => update({ economy: "token" as EconomyMode })}><strong>With a token</strong><span>Prepare a native project economy.</span></button>
          </div>
          {draft.economy === "token" && <div className="token-note">Real wallet/chain infrastructure will power deployment — never simulated.</div>}
          <button className="primary" disabled={!ready} onClick={() => setPublished(true)}>Prepare project</button>
        </>}
      </section>
    </main>
  );
}
