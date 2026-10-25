"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { WorkflowCanvas } from "@/components/workflow-canvas";
import SwipeRow from "@/components/SwipeRow";
import { Archive, FolderOpen } from "lucide-react";
import { useWorkspace } from "@/components/workspace-provider";
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
  const scope=useWorkspace();
  const [hasChanges, setHasChanges] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]), [companyId, setCompanyId] = useState(""), [loading, setLoading] = useState(true), [error, setError] = useState(""), [reload, setReload] = useState(0);
  useEffect(()=>{const check=(event:Event)=>{if(hasChanges&&!window.confirm("Discard unsaved workflow changes and switch company?"))event.preventDefault();};window.addEventListener("eidolon:before-company-switch",check);document.documentElement.dataset.eidolonWorkflowDirty=String(hasChanges);return()=>{window.removeEventListener("eidolon:before-company-switch",check);delete document.documentElement.dataset.eidolonWorkflowDirty;};},[hasChanges]);
  useEffect(() => {
    const controller = new AbortController(); setError(""); setLoading(true);
    read("/api/companies", controller.signal).then(d => { if (!controller.signal.aborted) { setCompanies(d.companies); const requested = new URLSearchParams(location.search).get("companyId"); setCompanyId(d.companies.some((c: Company) => c.id === requested) ? requested : d.companies[0]?.id ?? ""); } }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  return <main className="surface company-foundry premium-workflow"><EidolonNav section="company"/><header className="company-hero"><div className="eyebrow">EIDOLON / WORKFLOW BUILDER</div><h1>Agent workflows.</h1><p>Connect real agent deliverables and owner review steps.</p></header><div className="foundry-workspace"><div className="foundry-main" style={{ width: "100%", minWidth: 0 }}>
    <section className="company-section flow-company-context"><div className="company-section-head"><h2>Workflow workspace</h2><Link href={`/dashboard${companyId ? `?companyId=${companyId}` : ""}`}>Company dashboard ↗</Link></div>
      {loading ? <p role="status">Loading companies…</p> : error ? <p role="alert">{error} <Link href="/auth?next=/workflows">Sign in</Link> <button type="button" onClick={() => setReload(v => v + 1)}>Retry</button></p> : companies.length ? <label>Company <select value={companyId} onChange={e => scope.chooseCompany(e.target.value)}>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label> : <p>No companies yet. <Link href="/company">Create a company</Link> to begin.</p>}
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
  async function archive(workflow:Workflow){
    if(busy||dirty||!window.confirm(`Archive ${workflow.name}? Its run history stays available.`))return;
    setBusy(true);setError("");try{const response=await fetch("/api/company/workflows",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({companyId,id:workflow.id,name:workflow.name,description:workflow.description,nodes:workflow.nodes,edges:workflow.edges,status:"archived"})});const data=await response.json();if(!response.ok)throw Error(data.error||"Workflow could not be archived.");if(data.workflow?.id!==workflow.id||data.workflow?.status!=="archived")throw Error("The service did not confirm the archive. Refresh before trying again.");setWorkflows(rows=>rows.map(row=>row.id===workflow.id?data.workflow:row));if(selected===workflow.id)setStatus("archived");setNotice("Workflow archived. Its saved runs remain available.");}catch(error){setError(error instanceof Error?error.message:"Archive failed.");}finally{setBusy(false);}
  }
  function connectNodes(from: string, to: string) {
    const candidate = [...edges, { id: crypto.randomUUID(), source: from, target: to }], errors = validateGraph(nodes, candidate);
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
    <section className="company-section flow-library" aria-busy={loading}><div className="company-section-head"><h2>Saved workflows ({workflows.length})</h2><button type="button" disabled={busy} onClick={() => setReload(v => v + 1)}>Refresh</button></div>
      {loading && <p role="status">Loading workflow data…</p>}{!loading && !error && !workflows.length && <p>No saved workflows. Create a graph or start with the review template.</p>}
      <div className="flow-saved-list">{workflows.map(w => <SwipeRow key={w.id} label={`Actions for ${w.name}`} fullSwipe={false} disabled={busy||dirty} rowColor="#eff1e9" textColor="#1b263b" drawerColor="#1b263b" actionColor="#415a77" height={72} radius={16} actions={[{id:"open",label:"Open",icon:<FolderOpen size={17}/>},...(w.status!=="archived"?[{id:"archive",label:"Archive",icon:<Archive size={17}/>}]:[])]} onAction={action=>{if(action.id==="open")open(w);else void archive(w);}}><button className="flow-saved-open" type="button" disabled={busy} aria-pressed={selected===w.id} onClick={()=>open(w)}><FolderOpen size={19}/><span><strong>{w.name}</strong><small>{w.nodes.length} nodes · {w.status}</small></span></button></SwipeRow>)}</div>
      <button type="button" disabled={busy} onClick={() => open()}>New workflow</button> <button type="button" disabled={busy} onClick={() => open(undefined, true)}>Agent + owner review template</button>
      {workflows.length >= 100 && <p>Showing the latest 100 workflows.</p>}
    </section>
    <section className="company-section flow-editor-section" aria-busy={busy}><h2>Node editor {dirty ? "· unsaved changes" : ""}</h2>
      {error && <p role="alert" id="workflow-error">{error}</p>}{notice && <p role="status">{notice}</p>}
      <fieldset disabled={busy || loading} style={{ border: 0, padding: 0, minWidth: 0 }}>
        <details className="flow-metadata"><summary>Workflow details · {name}</summary><label>Workflow name<input value={name} minLength={2} maxLength={120} onChange={e => { setName(e.target.value); setDirty(true); }}/></label>
        <label>Description<textarea value={description} maxLength={1000} onChange={e => { setDescription(e.target.value); setDirty(true); }}/></label></details>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>{(["trigger", "agent", "review", "end"] as const).map(type => <button type="button" key={type} onClick={() => { setNodes(v => [...v, { id: crypto.randomUUID(), type, label: type === "trigger" ? "Start" : type === "end" ? "Finish" : type === "review" ? "Owner review" : "Agent action", x: 20 + (nodes.length % 4) * 210, y: 30 + Math.floor(nodes.length / 4) * 340 }]); setDirty(true); }}>+ {type}</button>)}</div>
        <p>Drag the Move handle, use its arrow keys, or edit X/Y coordinates. Each agent action generates a saved deliverable. Connections pass prior outputs to downstream agents; all branches run in dependency order.</p>
        <WorkflowCanvas nodes={nodes} edges={edges} agents={agents} edit={editNode} connect={connectNodes} remove={id=>{setNodes(values=>values.filter(n=>n.id!==id));setEdges(values=>values.filter(e=>e.source!==id&&e.target!==id));setDirty(true);}}/>
        <details className="flow-connection-details"><summary>Connection controls</summary><div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}><label>From <select value={source} onChange={e => setSource(e.target.value)}><option value="">Choose node</option>{nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}</select></label><label>To <select value={target} onChange={e => setTarget(e.target.value)}><option value="">Choose node</option>{nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}</select></label><button type="button" onClick={() => connectNodes(source,target)}>Connect nodes</button></div>
        <ul>{edges.map(e => <li key={e.id}>{nodes.find(n => n.id === e.source)?.label} → {nodes.find(n => n.id === e.target)?.label} <button type="button" onClick={() => { setEdges(v => v.filter(x => x.id !== e.id)); setDirty(true); }}>Disconnect</button></li>)}</ul></details>
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
