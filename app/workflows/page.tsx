"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { EidolonNav } from "@/components/eidolon-nav";
import { WorkflowRuns } from "@/components/workflow-runs";
import { validateGraph, workflowTemplate, type Workflow, type WorkflowNode, type WorkflowEdge } from "@/lib/workflow";
type Company = { id: string; name: string };
type Agent = { id: string; name: string; status: string; runtime: string };
async function read(url: string, signal?: AbortSignal) {
  const r = await fetch(url, { cache: "no-store", signal }); const d = await r.json();
  if (!r.ok) throw Error(d.error ?? "Unable to load data"); return d;
}
export default function WorkflowsPage() {
  const [hasChanges, setHasChanges] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]), [companyId, setCompanyId] = useState(""), [loading, setLoading] = useState(true), [error, setError] = useState(""), [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setError(""); setLoading(true);
    read("/api/companies", controller.signal).then(d => { if (!controller.signal.aborted) { setCompanies(d.companies); const requested = new URLSearchParams(location.search).get("companyId"); setCompanyId(d.companies.some((c: Company) => c.id === requested) ? requested : d.companies[0]?.id ?? ""); } }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  return <main className="surface company-foundry"><EidolonNav section="company"/><header className="company-hero"><div className="eyebrow">EIDOLON / WORKFLOW BUILDER</div><h1>Agent workflows.</h1><p>Connect real agent deliverables and owner review steps.</p></header><div className="foundry-workspace"><div className="foundry-main" style={{ width: "100%", minWidth: 0 }}>
    <section className="company-section"><div className="company-section-head"><h2>Workflow workspace</h2><Link href={`/dashboard${companyId ? `?companyId=${companyId}` : ""}`}>Company dashboard ↗</Link></div>
      {loading ? <p role="status">Loading companies…</p> : error ? <p role="alert">{error} <Link href="/auth?next=/workflows">Sign in</Link> <button type="button" onClick={() => setReload(v => v + 1)}>Retry</button></p> : companies.length ? <label>Company <select value={companyId} onChange={e => { if (!hasChanges || window.confirm("Discard unsaved workflow changes and switch company?")) { setHasChanges(false); setCompanyId(e.target.value); } }}>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label> : <p>No companies yet. <Link href="/company">Create a company</Link> to begin.</p>}
    </section>
    {companyId && <Editor key={companyId} companyId={companyId} onDirtyChange={setHasChanges}/>}
  </div></div></main>;
}
function Editor({ companyId, onDirtyChange }: { companyId: string; onDirtyChange: (dirty: boolean) => void }) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]), [agents, setAgents] = useState<Agent[]>([]), [loading, setLoading] = useState(true), [reload, setReload] = useState(0);
  const [selected, setSelected] = useState(""), [name, setName] = useState("New agent workflow"), [description, setDescription] = useState(""), [status, setStatus] = useState("draft"), [nodes, setNodes] = useState<WorkflowNode[]>([]), [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [source, setSource] = useState(""), [target, setTarget] = useState(""), [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false), [charges, setCharges] = useState(false), [runRefresh, setRunRefresh] = useState(0);
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setError("");
    Promise.all([read(`/api/company/workflows?companyId=${companyId}`, abort.signal), read(`/api/company/agents?companyId=${companyId}`, abort.signal)]).then(([w, a]) => { if (!abort.signal.aborted) { setWorkflows(w.workflows); setAgents(a.agents); } }).catch(e => { if (!abort.signal.aborted) setError(e.message); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [companyId, reload]);
  useEffect(() => { if (!dirty) return; const leave = (e: BeforeUnloadEvent) => { e.preventDefault(); }; window.addEventListener("beforeunload", leave); return () => window.removeEventListener("beforeunload", leave); }, [dirty]);
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  function open(w?: Workflow, template = false) {
    if (dirty && !window.confirm("Discard unsaved workflow changes?")) return;
    setSelected(w?.id ?? ""); setName(w?.name ?? "New agent workflow"); setDescription(w?.description ?? ""); setStatus(w?.status ?? "draft");
    const graph = template ? workflowTemplate() : { nodes: w?.nodes ?? [], edges: w?.edges ?? [] }; setNodes(graph.nodes); setEdges(graph.edges); setSource(""); setTarget(""); setDirty(template); setCharges(false); setError(""); setNotice("");
  }
  function editNode(id: string, value: Partial<WorkflowNode>) { setDirty(true); setNodes(v => v.map(n => n.id === id ? { ...n, ...value } : n)); }
  function connect() {
    const candidate = [...edges, { id: crypto.randomUUID(), source, target }], errors = validateGraph(nodes, candidate);
    if (errors.length) { setError(errors.join(" ")); return; } setEdges(candidate); setDirty(true); setError("");
  }
  async function mutation(action: "save" | "delete" | "start") {
    if (action === "delete" && !window.confirm("Delete this saved workflow? Workflows with run history must be archived instead.")) return;
    if (action === "save") { const errors = validateGraph(nodes, edges); if (errors.length) { setError(errors.join(" ")); return; } }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(action === "start" ? "/api/company/workflows/runs" : "/api/company/workflows", { method: action === "delete" ? "DELETE" : action === "save" && selected ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "start" ? { companyId, workflowId: selected, action: "start", confirmProviderCharges: charges } : { companyId, id: selected, name, description, nodes, edges, status }) });
      const data = await response.json(); if (!response.ok) throw Error(data.error);
      if (action === "save") { setSelected(data.workflow.id); setDirty(false); setWorkflows(v => [data.workflow, ...v.filter(w => w.id !== data.workflow.id)]); setNotice("Workflow saved."); }
      if (action === "delete") { setWorkflows(v => v.filter(w => w.id !== selected)); setDirty(false); setSelected(""); setNodes([]); setEdges([]); setName("New agent workflow"); setDescription(""); setStatus("draft"); setNotice("Workflow deleted."); }
      if (action === "start") { setRunRefresh(v => v + 1); setNotice("Run created from the saved workflow. Use Continue below to execute one step at a time."); }
    } catch (e) { setError(e instanceof Error ? e.message : "Action failed"); } finally { setBusy(false); }
  }
  const height = Math.max(420, ...nodes.map(n => n.y + 340)), width = Math.max(900, ...nodes.map(n => n.x + 200));
  return <>
    <section className="company-section" aria-busy={loading}><div className="company-section-head"><h2>Saved workflows ({workflows.length})</h2><button type="button" disabled={busy} onClick={() => setReload(v => v + 1)}>Refresh</button></div>
      {loading && <p role="status">Loading workflow data…</p>}{!loading && !error && !workflows.length && <p>No saved workflows. Create a graph or start with the review template.</p>}
      <div className="company-agent-list">{workflows.map(w => <button type="button" key={w.id} disabled={busy} aria-pressed={selected === w.id} onClick={() => open(w)}>{w.name} · {w.nodes.length} nodes · {w.status}</button>)}</div>
      <button type="button" disabled={busy} onClick={() => open()}>New workflow</button> <button type="button" disabled={busy} onClick={() => open(undefined, true)}>Agent + owner review template</button>
      {workflows.length >= 100 && <p>Showing the latest 100 workflows.</p>}
    </section>
    <section className="company-section" aria-busy={busy}><h2>Node editor {dirty ? "· unsaved changes" : ""}</h2>
      {error && <p role="alert" id="workflow-error">{error}</p>}{notice && <p role="status">{notice}</p>}
      <fieldset disabled={busy || loading} style={{ border: 0, padding: 0, minWidth: 0 }}>
        <label>Workflow name<input value={name} minLength={2} maxLength={120} onChange={e => { setName(e.target.value); setDirty(true); }}/></label>
        <label>Description<textarea value={description} maxLength={1000} onChange={e => { setDescription(e.target.value); setDirty(true); }}/></label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>{(["trigger", "agent", "review", "end"] as const).map(type => <button type="button" key={type} onClick={() => { setNodes(v => [...v, { id: crypto.randomUUID(), type, label: type === "trigger" ? "Start" : type === "end" ? "Finish" : type === "review" ? "Owner review" : "Agent action", x: 20 + (nodes.length % 4) * 210, y: 30 + Math.floor(nodes.length / 4) * 340 }]); setDirty(true); }}>+ {type}</button>)}</div>
        <p>Drag the Move handle, use its arrow keys, or edit X/Y coordinates. Each agent action generates a saved deliverable. Connections pass prior outputs to downstream agents; all branches run in dependency order.</p>
        <div style={{ overflow: "auto", maxHeight: 800, border: "1px solid currentColor", borderRadius: 12 }}><div style={{ position: "relative", width, height }}>
          <svg width={width} height={height} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true">{edges.map(e => { const a = nodes.find(n => n.id === e.source), b = nodes.find(n => n.id === e.target); return a && b ? <line key={e.id} x1={a.x + 90} y1={a.y + 20} x2={b.x + 90} y2={b.y + 20} stroke="currentColor" strokeWidth={2}/> : null; })}</svg>
          {nodes.map(n => <div key={n.id} style={{ position: "absolute", left: n.x, top: n.y, width: 190, padding: 10, border: "1px solid currentColor", borderRadius: 12, background: "#fff", color: "#151515" }}>
            <button type="button" aria-label={`Move ${n.label}. Use arrow keys to move.`} style={{ touchAction: "none" }} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) editNode(n.id, { x: Math.max(0, Math.min(9000, n.x + e.movementX)), y: Math.max(0, Math.min(9000, n.y + e.movementY)) }); }} onPointerUp={e => e.currentTarget.releasePointerCapture(e.pointerId)} onKeyDown={e => { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) { e.preventDefault(); editNode(n.id, { x: Math.max(0, Math.min(9000, n.x + (e.key === "ArrowLeft" ? -10 : e.key === "ArrowRight" ? 10 : 0))), y: Math.max(0, Math.min(9000, n.y + (e.key === "ArrowUp" ? -10 : e.key === "ArrowDown" ? 10 : 0))) }); } }}>Move · {n.type}</button>
            <label>Label<input style={{ width: "100%" }} value={n.label} maxLength={100} onChange={e => editNode(n.id, { label: e.target.value })}/></label>
            {n.type === "agent" && <><label>Agent<select style={{ width: "100%" }} value={n.agentId ?? ""} onChange={e => editNode(n.id, { agentId: e.target.value || undefined })}><option value="">Choose agent</option>{agents.map(a => <option key={a.id} value={a.id}>{a.name} · {a.status}</option>)}</select></label><label>Instruction<textarea value={n.prompt ?? ""} maxLength={8000} style={{ width: "100%" }} onChange={e => editNode(n.id, { prompt: e.target.value })}/></label></>}
            <label>X <input type="number" min={0} max={9000} value={n.x} style={{ width: 65 }} onChange={e => editNode(n.id, { x: Math.max(0, Math.min(9000, Number(e.target.value))) })}/></label> <label>Y <input type="number" min={0} max={9000} value={n.y} style={{ width: 65 }} onChange={e => editNode(n.id, { y: Math.max(0, Math.min(9000, Number(e.target.value))) })}/></label>
            <button type="button" onClick={() => { setNodes(v => v.filter(x => x.id !== n.id)); setEdges(v => v.filter(e => e.source !== n.id && e.target !== n.id)); setDirty(true); }}>Remove {n.type}</button>
          </div>)}
        </div></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}><label>From <select value={source} onChange={e => setSource(e.target.value)}><option value="">Choose node</option>{nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}</select></label><label>To <select value={target} onChange={e => setTarget(e.target.value)}><option value="">Choose node</option>{nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}</select></label><button type="button" onClick={connect}>Connect nodes</button></div>
        <ul>{edges.map(e => <li key={e.id}>{nodes.find(n => n.id === e.source)?.label} → {nodes.find(n => n.id === e.target)?.label} <button type="button" onClick={() => { setEdges(v => v.filter(x => x.id !== e.id)); setDirty(true); }}>Disconnect</button></li>)}</ul>
        <label>Status <select value={status} onChange={e => { setStatus(e.target.value); setDirty(true); }}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></label>
        <p>Active workflows run only when you start and continue them. Archived workflows cannot start new runs.</p>
        <button type="button" onClick={() => { const errors = validateGraph(nodes, edges, true); setError(errors.join(" ")); setNotice(errors.length ? "" : "Graph is executable. Agent status and connections are checked again during execution."); }}>Validate for execution</button> <button type="button" className="primary" disabled={name.trim().length < 2} onClick={() => void mutation("save")}>Save workflow</button>
        {selected && <button type="button" onClick={() => void mutation("delete")}>Delete workflow</button>}
        <p><label><input type="checkbox" checked={charges} onChange={e => setCharges(e.target.checked)}/> I authorize provider usage charges for this run.</label></p>
        <button type="button" disabled={!selected || dirty || !charges || status === "archived"} onClick={() => void mutation("start")}>Start saved workflow run</button><p>Save changes and authorize provider usage before starting. Review all outputs before approving a review step.</p>
      </fieldset>
    </section><WorkflowRuns companyId={companyId} refreshKey={runRefresh}/>
  </>;
}
