"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { orderNodes, type WorkflowRun } from "@/lib/workflow";
export function WorkflowRuns({ companyId, refreshKey }: { companyId: string; refreshKey: number }) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]), [error, setError] = useState(""), [loading, setLoading] = useState(true), [busy, setBusy] = useState(""), [reload, setReload] = useState(0);
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setError("");
    fetch(`/api/company/workflows/runs?companyId=${companyId}`, { cache: "no-store", signal: abort.signal }).then(async r => {
      const data = await r.json(); if (!r.ok) throw Error(data.error); if (!abort.signal.aborted) setRuns(data.runs);
    }).catch(e => { if (!abort.signal.aborted) setError(e.message || "Run history unavailable"); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [companyId, refreshKey, reload]);
  async function action(runId: string, action: string) {
    setBusy(runId); setError("");
    try {
      const response = await fetch("/api/company/workflows/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId, runId, action }) });
      const data = await response.json(); if (!response.ok) throw Error(data.error);
      setRuns(rows => rows.map(r => r.id === runId ? data.run : r));
    } catch (e) { setError((e instanceof Error ? e.message : "Run action failed") + " Refresh runs before trying another action."); }
    finally { setBusy(""); }
  }
  return <section className="company-section" aria-busy={loading || !!busy}>
    <div className="company-section-head"><h2>Run history</h2><button type="button" disabled={!!busy || loading} onClick={() => setReload(v => v + 1)}>Refresh runs</button></div>
    <p>Each Continue executes one step. Agent steps call the saved provider and may incur charges. Review pauses require owner approval. No outbound messages, payments, or external tool actions are supported.</p>
    {loading && <p role="status">Loading runs…</p>}{error && <p role="alert">{error}</p>}
    {!loading && !error && !runs.length && <p>No runs yet. Save a valid workflow, then start a run.</p>}
    {runs.map(run => <article key={run.id} className="company-agent">
      <h3>{run.name} · {run.status}</h3><small>{new Date(run.created_at).toLocaleString()} · {run.id}</small>
      <p>Next step: {orderNodes(run.nodes, run.edges)[run.cursor]?.label ?? "None"}. Recorded steps: {run.steps.length}.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {run.status === "ready" && <button type="button" disabled={!!busy} onClick={() => void action(run.id, "advance")}>{busy === run.id ? "Executing…" : "Continue one step"}</button>}
        {run.status === "review" && <button type="button" disabled={!!busy} onClick={() => void action(run.id, "approve")}>Approve reviewed output</button>}
        {["ready", "review"].includes(run.status) && <button type="button" disabled={!!busy} onClick={() => void action(run.id, "cancel")}>Cancel remaining steps</button>}
        {run.status === "running" && <><p role="status">Step claimed. Refresh to see its result. Interrupted steps are never automatically retried.</p><button type="button" disabled={!!busy || Date.now() - Date.parse(run.updated_at) <= 240000} onClick={() => void action(run.id, "interrupt")}>Mark interrupted after 4 minutes</button></>}
      </div>
      <ol>{run.steps.map((step, i) => <li key={i}><strong>{step.label}: {step.status}</strong> <small>{new Date(step.at).toLocaleString()}</small>{step.message && <p>{step.message}</p>}{step.taskId && <p>Task {step.taskId} · <Link href={`/company?companyId=${companyId}`}>Open company work history</Link></p>}{step.result && <details><summary>Saved output</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{step.result}</pre></details>}</li>)}</ol>
    </article>)}
    {runs.length >= 25 && <p>Showing the latest 25 runs. Older records remain stored.</p>}
  </section>;
}
