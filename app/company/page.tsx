"use client";

import { useCallback, useEffect, useState } from "react";
import { EidolonNav } from "@/components/eidolon-nav";

type Company = { id:string; name:string; slug:string; industry:string; mission:string; businessModel:string; targetCustomer:string; status:string };
type Connection = { id:string; provider:string; display_name:string; auth_method:string; status:string; created_at:string };
type Agent = { id:string; name:string; role:string; description:string; runtime:string; provider:string|null; model:string|null; status:string };
type Artifact = { id:string; title:string; body:string; artifact_type:string; source_provider:string|null; created_at:string };

const providerNames:Record<string,string> = {openai:"OpenAI",anthropic:"Anthropic / Claude",openrouter:"OpenRouter"};
const industries = ["AI & software","E-commerce","Creative studio","Marketing agency","Media & publishing","Education","Consulting","Developer tools","Finance & operations","Other"];

export default function CompanyPage() {
  const [companies,setCompanies] = useState<Company[]>([]);
  const [companyId,setCompanyId] = useState("");
  const [connections,setConnections] = useState<Connection[]>([]);
  const [agents,setAgents] = useState<Agent[]>([]);
  const [artifacts,setArtifacts] = useState<Artifact[]>([]);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [busy,setBusy] = useState(false);
  const [name,setName] = useState("");
  const [industry,setIndustry] = useState(industries[0]);
  const [mission,setMission] = useState("");
  const [businessModel,setBusinessModel] = useState("");
  const [targetCustomer,setTargetCustomer] = useState("");
  const [provider,setProvider] = useState("openai");
  const [apiKey,setApiKey] = useState("");
  const [employeeName,setEmployeeName] = useState("AI Operations Lead");
  const [employeeRole,setEmployeeRole] = useState("Operations manager");
  const [employeeProvider,setEmployeeProvider] = useState("openai");
  const [model,setModel] = useState("gpt-4.1-mini");
  const [taskTitle,setTaskTitle] = useState("Company launch plan");
  const [taskType,setTaskType] = useState("planning");
  const [prompt,setPrompt] = useState("Create a practical 30-day launch plan with priorities, deliverables, weekly milestones, risks, and metrics. Label assumptions clearly.");
  const [result,setResult] = useState("");

  const loadCompanies = useCallback(async () => {
    const response = await fetch("/api/companies",{cache:"no-store"});
    if (response.status === 401) { window.location.href="/auth?next=/company"; return; }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Companies could not be loaded.");
    const items = (data.companies ?? []) as Company[];
    setCompanies(items);
    setCompanyId((current) => items.some((item) => item.id === current) ? current : items[0]?.id ?? "");
  },[]);
  const loadCompanyData = useCallback(async (id:string) => {
    if (!id) { setConnections([]); setAgents([]); setArtifacts([]); return; }
    const [connectionResponse,agentResponse,workResponse] = await Promise.all([
      fetch("/api/company/connections?companyId="+encodeURIComponent(id),{cache:"no-store"}),
      fetch("/api/company/agents?companyId="+encodeURIComponent(id),{cache:"no-store"}),
      fetch("/api/company/work?companyId="+encodeURIComponent(id),{cache:"no-store"})
    ]);
    const [connectionData,agentData,workData] = await Promise.all([connectionResponse.json(),agentResponse.json(),workResponse.json()]);
    if (!connectionResponse.ok) throw new Error(connectionData.error ?? "Connections could not be loaded.");
    if (!agentResponse.ok) throw new Error(agentData.error ?? "AI workforce could not be loaded.");
    if (!workResponse.ok) throw new Error(workData.error ?? "Company work history could not be loaded.");
    setConnections(connectionData.connections ?? []);
    setAgents(agentData.agents ?? []);
    setArtifacts(workData.artifacts ?? []);
  },[]);
  useEffect(() => { loadCompanies().catch((e:unknown)=>setError(e instanceof Error?e.message:"Company service unavailable.")); },[loadCompanies]);
  useEffect(() => { if(companyId) loadCompanyData(companyId).catch((e:unknown)=>setError(e instanceof Error?e.message:"Company data unavailable.")); },[companyId,loadCompanyData]);

  async function submitJson(url:string,body:unknown) {
    const response = await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Request failed.");
    return data;
  }
  async function createCompany() {
    setBusy(true);setError("");setNotice("");
    try {
      const data = await submitJson("/api/companies",{name,industry,mission,businessModel,targetCustomer,launchPlan:{initialTeam:"hybrid",createdFrom:"company-foundry"}});
      const created = data.company as Company;
      setCompanies((items)=>[created,...items]);setCompanyId(created.id);setName("");setMission("");setBusinessModel("");setTargetCustomer("");
      setNotice("Company workspace created and owner membership persisted.");
    } catch(e) { setError(e instanceof Error?e.message:"Company could not be created."); } finally { setBusy(false); }
  }
  async function connectProvider() {
    if(!companyId)return;
    setBusy(true);setError("");setNotice("");
    try {
      await submitJson("/api/company/connections",{companyId,provider,apiKey});
      setApiKey("");await loadCompanyData(companyId);setNotice(providerNames[provider]+" API connection verified and saved encrypted.");
    } catch(e) { setError(e instanceof Error?e.message:"Provider connection failed."); } finally { setBusy(false); }
  }
  async function addEmployee() {
    if(!companyId)return;
    setBusy(true);setError("");setNotice("");
    try {
      const connection = connections.find((item)=>item.provider===employeeProvider && item.status==="connected" && item.auth_method==="api_key");
      const data = await submitJson("/api/company/agents",{companyId,name:employeeName,role:employeeRole,description:"AI employee assigned by the company owner.",runtime:connection?"provider":"eidolon",provider:connection?employeeProvider:null,connectionId:connection?.id,model:connection?model:"",instructions:"Work only on explicitly assigned tasks. State assumptions and never claim external actions were completed unless verified."});
      setAgents((items)=>[data.agent,...items]);setNotice(connection?"AI employee created with a connected provider.":"Native EIDOLON employee profile created as a draft; connect a provider to execute model-powered tasks.");
    } catch(e) { setError(e instanceof Error?e.message:"Employee could not be created."); } finally { setBusy(false); }
  }
  async function generate() {
    if(!companyId)return;
    const connection = connections.find((item)=>item.provider===employeeProvider && item.status==="connected" && item.auth_method==="api_key");
    if(!connection){setError("Connect the selected provider's API key first. A ChatGPT or Claude consumer subscription is not automatically API access.");return;}
    setBusy(true);setError("");setNotice("");setResult("");
    try {
      const data = await submitJson("/api/company/generate",{companyId,connectionId:connection.id,model,title:taskTitle,taskType,prompt});
      setResult(data.result ?? "");await loadCompanyData(companyId);setNotice("Task completed and the deliverable was saved to the company archive.");
    } catch(e) { setError(e instanceof Error?e.message:"Generation failed."); } finally { setBusy(false); }
  }

  const selectedCompany = companies.find((item)=>item.id===companyId);
  return <main className="surface company-foundry">
    <EidolonNav section="company" />
    <header className="company-hero">
      <div className="eyebrow">EIDOLON / COMPANY FOUNDRY</div>
      <div className="company-hero-grid"><div><h1>Launch a company.<br/><em>Build its workforce.</em></h1><p>Turn an idea into an operating plan, assemble human and AI roles, connect supported AI providers, and create real company deliverables.</p></div><div className="company-orbit" aria-hidden="true"><span/><span/><span/><i>EC</i></div></div>
      <div className="company-truth"><span className="status-dot"/> REAL COMPANY RECORDS <span>·</span> REAL PROVIDER CALLS <span>·</span> NO SIMULATED REVENUE OR EMPLOYEES</div>
    </header>

    {error && <div className="company-alert error" role="alert">{error}</div>}
    {notice && <div className="company-alert success" role="status">{notice}</div>}

    <section className="company-section">
      <div className="company-section-head"><div><div className="eyebrow">01 / FOUNDING</div><h2>Company blueprint</h2></div><span>IDENTITY · MISSION · BUSINESS MODEL</span></div>
      <div className="company-layout">
        <form className="company-form" onSubmit={(event)=>{event.preventDefault();void createCompany();}}>
          <label>Company name<input value={name} onChange={(e)=>setName(e.target.value)} minLength={2} maxLength={120} required placeholder="e.g. Northstar Digital"/></label>
          <label>Industry<select value={industry} onChange={(e)=>setIndustry(e.target.value)}>{industries.map((item)=><option key={item}>{item}</option>)}</select></label>
          <label>Mission and what it will do<textarea value={mission} onChange={(e)=>setMission(e.target.value)} minLength={10} maxLength={4000} required rows={4} placeholder="What problem will this company solve, for whom, and why?"/></label>
          <label>Business model<input value={businessModel} onChange={(e)=>setBusinessModel(e.target.value)} maxLength={240} placeholder="Subscriptions, services, marketplace…"/></label>
          <label>Target customers<input value={targetCustomer} onChange={(e)=>setTargetCustomer(e.target.value)} maxLength={1000} placeholder="Who will pay or use the product?"/></label>
          <button className="primary" disabled={busy}>{busy?"Working…":"Create company workspace"} <span>↗</span></button>
        </form>
        <aside className="company-records"><div className="company-records-head"><div><div className="eyebrow">YOUR COMPANIES</div><strong>{companies.length.toString().padStart(2,"0")} records</strong></div><span className="company-tag">PERSISTED</span></div>
          {companies.length===0?<div className="company-empty"><span>◇</span><strong>No company launched yet</strong><p>Create a company blueprint to establish its workspace. This does not register a legal entity.</p></div>:<div className="company-list">{companies.map((company)=><button key={company.id} className={companyId===company.id?"company-list-item active":"company-list-item"} onClick={()=>setCompanyId(company.id)}><span className="company-list-glyph">C</span><span><b>{company.name}</b><small>{company.industry} · {company.status}</small></span><i>↗</i></button>)}</div>}
          {selectedCompany&&<div className="company-selected"><span>SELECTED COMPANY</span><strong>{selectedCompany.name}</strong><p>{selectedCompany.mission}</p></div>}
        </aside>
      </div>
    </section>

    {selectedCompany&&<><section className="company-section">
      <div className="company-section-head"><div><div className="eyebrow">02 / INTELLIGENCE</div><h2>Connect AI providers</h2></div><span>SERVER-SIDE ENCRYPTED CREDENTIALS</span></div>
      <div className="company-connect-layout"><div className="company-connect-copy"><p>Connect an OpenAI, Anthropic, or OpenRouter <strong>API key</strong>. EIDOLON verifies it against the provider and encrypts it before storage. Keys are never returned by the connection-list API.</p><p className="company-muted">A ChatGPT Plus or Claude Pro subscription is not the same as API access. Consumer-account agent linking will only be offered through an official supported OAuth/MCP integration—not by collecting passwords or automating account sessions.</p></div>
        <form className="company-form company-connect-form" onSubmit={(event)=>{event.preventDefault();void connectProvider();}}>
          <label>Provider<select value={provider} onChange={(e)=>setProvider(e.target.value)}><option value="openai">OpenAI API</option><option value="anthropic">Anthropic / Claude API</option><option value="openrouter">OpenRouter API</option></select></label>
          <label>Secret API key<input type="password" autoComplete="off" value={apiKey} onChange={(e)=>setApiKey(e.target.value)} minLength={12} maxLength={4096} required placeholder="Stored encrypted; never displayed again"/></label>
          <button className="primary" disabled={busy||!apiKey.trim()}>{busy?"Verifying…":"Verify & connect"} <span>↗</span></button>
        </form>
      </div>
      <div className="company-connection-list">{connections.length===0?<span className="company-muted">No providers connected to this company.</span>:connections.map((connection)=><div key={connection.id} className="company-connection"><span className="company-provider-mark">{connection.provider==="anthropic"?"A":connection.provider==="openrouter"?"R":"O"}</span><span><b>{connection.display_name}</b><small>{connection.auth_method.replace("_"," ")} · {connection.status}</small></span><span className={connection.status==="connected"?"company-status live":"company-status"}>{connection.status}</span></div>)}</div>
    </section>

    <section className="company-section">
      <div className="company-section-head"><div><div className="eyebrow">03 / ORGANIZATION</div><h2>AI employees</h2></div><span>ROLE · INSTRUCTIONS · PROVIDER</span></div>
      <div className="company-workforce-layout"><form className="company-form" onSubmit={(event)=>{event.preventDefault();void addEmployee();}}>
        <label>Employee name<input value={employeeName} onChange={(e)=>setEmployeeName(e.target.value)} minLength={2} maxLength={100} required/></label>
        <label>Role<input value={employeeRole} onChange={(e)=>setEmployeeRole(e.target.value)} minLength={2} maxLength={120} required/></label>
        <label>Preferred provider<select value={employeeProvider} onChange={(e)=>{setEmployeeProvider(e.target.value);setModel(e.target.value==="anthropic"?"claude-sonnet-4-5":e.target.value==="openrouter"?"openai/gpt-4.1-mini":"gpt-4.1-mini");}}><option value="openai">OpenAI</option><option value="anthropic">Anthropic / Claude</option><option value="openrouter">OpenRouter</option></select></label>
        <label>Model ID<input value={model} onChange={(e)=>setModel(e.target.value)} maxLength={160} required placeholder="Exact model ID from provider"/></label>
        <button className="primary" disabled={busy}>{busy?"Saving…":"Add AI employee"} <span>↗</span></button>
      </form>
      <div className="company-agent-list">{agents.length===0?<div className="company-empty"><span>⌘</span><strong>Your workforce starts here</strong><p>Create role profiles and assign connected model providers. New employees start as drafts.</p></div>:agents.map((agent)=><article key={agent.id} className="company-agent"><div className="company-agent-icon">{agent.runtime==="provider"?"✳":"◇"}</div><div className="company-agent-main"><div className="company-agent-top"><strong>{agent.name}</strong><span className={"company-status "+(agent.status==="active"?"live":"")}>{agent.status}</span></div><span>{agent.role}</span><small>{agent.runtime==="provider"?providerNames[agent.provider??""]+" · "+(agent.model??"Model not set"):"Native EIDOLON profile · provider needed for model execution"}</small></div></article>)}</div></div>
    </section>

    <section className="company-section">
      <div className="company-section-head"><div><div className="eyebrow">04 / OPERATIONS</div><h2>Plan, research and create</h2></div><span>PROVIDER-EXECUTED DELIVERABLES</span></div>
      <div className="company-generation-layout"><form className="company-form" onSubmit={(event)=>{event.preventDefault();void generate();}}>
        <label>Task title<input value={taskTitle} onChange={(e)=>setTaskTitle(e.target.value)} minLength={2} maxLength={180} required/></label>
        <label>Work type<select value={taskType} onChange={(e)=>setTaskType(e.target.value)}><option value="planning">Company planning</option><option value="research">Research brief</option><option value="content">Content creation</option><option value="marketing">Marketing campaign</option><option value="product">Product strategy</option><option value="coding">Coding / technical brief</option><option value="operations">Operations workflow</option><option value="general">General task</option></select></label>
        <label>Instructions<textarea value={prompt} onChange={(e)=>setPrompt(e.target.value)} rows={5} minLength={5} maxLength={12000} required/></label>
        <label>Provider<select value={employeeProvider} onChange={(e)=>setEmployeeProvider(e.target.value)}><option value="openai">OpenAI</option><option value="anthropic">Anthropic / Claude</option><option value="openrouter">OpenRouter</option></select></label>
        <label>Model ID<input value={model} onChange={(e)=>setModel(e.target.value)} required/></label>
        <button className="primary" disabled={busy}>{busy?"Executing real provider call…":"Run task & save deliverable"} <span>↗</span></button>
      </form><div className="company-output"><div className="company-output-head"><span>DELIVERABLE PREVIEW</span><span>{result?"GENERATED":"AWAITING TASK"}</span></div>{result?<pre>{result}</pre>:<div className="company-empty"><span>✳</span><strong>Work becomes an artifact</strong><p>Company context and your instructions are sent to the selected connected provider. The returned output is saved to the company archive.</p></div>}</div></div>
      <div className="company-archive"><div className="eyebrow">COMPANY ARCHIVE / RECENT ARTIFACTS</div>{artifacts.length===0?<p className="company-muted">No deliverables recorded yet.</p>:artifacts.map((artifact)=><article className="company-artifact" key={artifact.id}><div><b>{artifact.title}</b><small>{artifact.artifact_type} · {artifact.source_provider??"provider"} · {new Date(artifact.created_at).toLocaleString()}</small></div><button type="button" className="quiet-button" onClick={()=>setResult(artifact.body)}>Open</button></article>)}</div>
    </section></>}
    <footer><span>EIDOLON / COMPANY FOUNDRY</span><span>LAUNCH · STAFF · OPERATE</span></footer>
  </main>;
}
