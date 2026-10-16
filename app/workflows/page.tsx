"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {EidolonNav} from "@/components/eidolon-nav";
type Company={id:string;name:string};
type Node={id:string;type:string;label:string;agentId?:string;x:number;y:number};
type Edge={id:string;source:string;target:string};
type Workflow={id:string;name:string;nodes:Node[];edges:Edge[];status:string;updated_at:string};
const id=()=>crypto.randomUUID();
export default function WorkflowsPage(){
 const [companies,setCompanies]=useState<Company[]>([]),[companyId,setCompanyId]=useState(""),[agents,setAgents]=useState<{id:string;name:string}[]>([]);
 const [workflows,setWorkflows]=useState<Workflow[]>([]),[selected,setSelected]=useState(""),[name,setName]=useState("New agent workflow"),[nodes,setNodes]=useState<Node[]>([]),[edges,setEdges]=useState<Edge[]>([]),[status,setStatus]=useState("draft"),[source,setSource]=useState(""),[target,setTarget]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{fetch("/api/companies").then(async r=>{if(r.status===401){location.href="/auth?next=/workflows";return;}const d=await r.json();setCompanies(d.companies??[]);setCompanyId(d.companies?.[0]?.id??"");}).catch(()=>setError("Could not load companies"));},[]);
 async function refresh(company:string){
  const r=await fetch("/api/company/workflows?companyId="+encodeURIComponent(company),{cache:"no-store"});const d=await r.json();if(!r.ok)throw Error(d.error??"Unable to load workflows");setWorkflows(d.workflows??[]);
 }
 useEffect(()=>{if(!companyId)return;let active=true;Promise.all([fetch("/api/company/workflows?companyId="+companyId).then(r=>r.json()),fetch("/api/company/agents?companyId="+companyId).then(r=>r.json())]).then(([w,a])=>{if(active){setWorkflows(w.workflows??[]);setAgents(a.agents??[]);setSelected("");setNodes([]);setEdges([]);setName("New agent workflow");}}).catch(()=>{if(active)setError("Could not load workflow data")});return()=>{active=false};},[companyId]);
 function open(w:Workflow){setSelected(w.id);setName(w.name);setNodes(w.nodes);setEdges(w.edges);setStatus(w.status);setError("");setNotice("");}
 function add(type:string){const n:Node={id:id(),type,label:type==="agent"?"AI agent":type==="trigger"?"Start":type==="review"?"Human review":"Finish",x:80+(nodes.length%4)*200,y:80+Math.floor(nodes.length/4)*130};setNodes(v=>[...v,n]);}
 function remove(nodeId:string){setNodes(v=>v.filter(n=>n.id!==nodeId));setEdges(v=>v.filter(e=>e.source!==nodeId&&e.target!==nodeId));}
 function connect(){if(!source||!target||source===target||edges.some(e=>e.source===source&&e.target===target)){setError("Choose two different unconnected nodes");return;}setEdges(v=>[...v,{id:id(),source,target}]);setError("");}
 async function save(){
  if(!companyId)return;setBusy(true);setError("");setNotice("");
  try{
   const method=selected?"PATCH":"POST",payload={companyId,...(selected?{id:selected}:{}),name,nodes,edges,status};
   const r=await fetch("/api/company/workflows",{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
   const d=await r.json();if(!r.ok)throw Error(d.error??"Save failed");
   setSelected(d.workflow.id);await refresh(companyId);setNotice("Workflow graph saved. Running agent actions requires a separate execution engine; this editor does not simulate execution.");
  }catch(e){setError(e instanceof Error?e.message:"Save failed")}finally{setBusy(false)}
 }
 return <main className="surface company-foundry"><EidolonNav section="company"/><header className="company-hero"><div className="eyebrow">EIDOLON / WORKFLOW BUILDER</div><h1>Agent workflows.</h1><p>Compose, connect, and save company-scoped AI agent workflows. Nodes are configuration only; no fake executions.</p></header><div className="foundry-workspace"><div className="foundry-main" style={{width:"100%"}}>
 <section className="company-section"><div className="company-section-head"><h2>Workflow workspace</h2><Link href="/company">Company dashboard ↗</Link></div>{companies.length?<label>Company <select value={companyId} onChange={e=>setCompanyId(e.target.value)}>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>:<p>Create a company first in Company Foundry.</p>}
 {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}</section>
 {companyId&&<><section className="company-section"><div className="company-section-head"><h2>Saved workflows ({workflows.length})</h2><button type="button" onClick={()=>{setSelected("");setName("New agent workflow");setNodes([]);setEdges([]);setStatus("draft");}}>New workflow +</button></div><div className="company-agent-list">{workflows.map(w=><button key={w.id} type="button" className="quiet-button" onClick={()=>open(w)}>{w.name} · {w.nodes.length} nodes · {w.status}</button>)}</div></section>
 <section className="company-section"><div className="company-section-head"><h2>Node editor</h2><span>{nodes.length} nodes / {edges.length} connections</span></div><label>Workflow name<input value={name} maxLength={120} onChange={e=>setName(e.target.value)}/></label><div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"16px 0"}}>{["trigger","agent","review","end"].map(t=><button type="button" key={t} onClick={()=>add(t)}>+ {t}</button>)}</div>
 <div style={{position:"relative",height:Math.max(440,Math.ceil(nodes.length/4)*145+120),minWidth:650,overflow:"auto",border:"1px solid currentColor",borderRadius:12}}>
 <svg viewBox={`0 0 900 ${Math.max(440,Math.ceil(nodes.length/4)*145+120)}`} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}} aria-hidden="true">{edges.map(e=>{const a=nodes.find(n=>n.id===e.source),b=nodes.find(n=>n.id===e.target);return a&&b?<line key={e.id} x1={a.x+75} y1={a.y+35} x2={b.x+75} y2={b.y+35} stroke="currentColor" strokeWidth={2}/>:null})}</svg>
 {nodes.map(n=><div key={n.id} style={{position:"absolute",left:n.x,top:n.y,width:155,padding:12,border:"1px solid currentColor",borderRadius:12,background:"#fff",color:"#151515"}}><small>{n.type.toUpperCase()}</small><input aria-label={n.type+" node label"} style={{width:"100%"}} value={n.label} onChange={e=>setNodes(v=>v.map(x=>x.id===n.id?{...x,label:e.target.value}:x))}/>{n.type==="agent"&&<select aria-label="Assigned agent" style={{width:"100%"}} value={n.agentId??""} onChange={e=>setNodes(v=>v.map(x=>x.id===n.id?{...x,agentId:e.target.value||undefined}:x))}><option value="">Unassigned</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>}<button type="button" onClick={()=>remove(n.id)}>Remove</button></div>)}</div>
 <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"16px 0"}}><label>From <select value={source} onChange={e=>setSource(e.target.value)}><option value="">Choose node</option>{nodes.map(n=><option key={n.id} value={n.id}>{n.label}</option>)}</select></label><label>To <select value={target} onChange={e=>setTarget(e.target.value)}><option value="">Choose node</option>{nodes.map(n=><option key={n.id} value={n.id}>{n.label}</option>)}</select></label><button type="button" onClick={connect}>Connect nodes</button></div>
 {edges.map(e=><div key={e.id}>{nodes.find(n=>n.id===e.source)?.label} → {nodes.find(n=>n.id===e.target)?.label} <button type="button" onClick={()=>setEdges(v=>v.filter(x=>x.id!==e.id))}>Disconnect</button></div>)}
 <label>Status <select value={status} onChange={e=>setStatus(e.target.value)}><option value="draft">Draft</option><option value="active">Active configuration</option><option value="archived">Archived</option></select></label><p className="company-muted">Active means saved configuration, not automatic execution. Cycles and invalid edges are rejected on the server.</p><button className="primary" type="button" disabled={busy||!name.trim()} onClick={()=>void save()}>{busy?"Saving…":"Save workflow"}</button></section></>}
 </div></div></main>;
}
