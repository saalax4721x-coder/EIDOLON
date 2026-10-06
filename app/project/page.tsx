import Link from "next/link";
import { projectActionDescriptions, projectActionLabels, type ProjectAction } from "@/lib/eidolon";

const data = {
  name: "NOVA",
  kind: "AI infrastructure",
  source: "GitHub · Verified",
  description: "Composable inference infrastructure for builders.",
  actions: ["use", "contribute", "sponsor", "license", "follow"] as ProjectAction[],
};

export default function Project() {
  return (
    <main className="project-page">
      <header className="surface-nav">
        <Link href="/" className="wordmark">EIDOLON</Link>
        <span>PROJECT / NOVA</span>
      </header>

      <section className="project-hero">
        <div className="eyebrow">{data.kind} · {data.source}</div>
        <h1>{data.name}</h1>
        <p>{data.description}</p>
        <div className="project-actions">
          {data.actions.slice(0, 3).map((action) => (
            <button key={action}>{projectActionLabels[action]}</button>
          ))}
        </div>
      </section>

      <section className="project-sections">
        <article>
          <span className="eyebrow">IDENTITY</span>
          <h2>Verified source</h2>
          <p>The project identity is anchored to a real source. Verification, ownership and provenance remain separate from discovery.</p>
          <div className="source-row"><strong>GitHub</strong><span>VERIFIED</span></div>
        </article>

        <article>
          <span className="eyebrow">AVAILABLE ACTIONS</span>
          <h2>What you can do</h2>
          <div className="action-list">
            {data.actions.map((action) => (
              <div className="action-item" key={action}>
                <strong>{projectActionLabels[action]}</strong>
                <span>{projectActionDescriptions[action]}</span>
              </div>
            ))}
          </div>
        </article>

        <article>
          <span className="eyebrow">ECONOMY</span>
          <h2>No token enabled</h2>
          <p>This project launched without a token. An economy can be activated later without changing the canonical project identity.</p>
          <Link className="economy-link" href="/economy">Explore economy →</Link>
        </article>

        <article>
          <span className="eyebrow">GRAPH</span>
          <h2>Connected projects</h2>
          <p>Dependencies, collaborators, services and compositions will appear here as the network grows.</p>
        </article>
      </section>
    </main>
  );
}
