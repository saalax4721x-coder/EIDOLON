"use client";

import { useCallback, useEffect, useState } from "react";
import { EidolonNav } from "@/components/eidolon-nav";

type Company = { id:string; name:string; slug:string; industry:string; mission:string; businessModel:string; targetCustomer:string; status:string };
type Connection = { id:string; provider:string; display_name:string; auth_method:string; status:string; created_at:string };
type Agent = { id:string; name:string; role:string; description:string; runtime:string; provider:string|null; model:string|null; connection_id:string|null; status:string };
type Artifact = { id:string; title:string; body:string; artifact_type:string; source_provider:string|null; created_at:string };
type CompanyTask = { id:string; title:string; objective:string; task_type:string; status:string; result:string|null; error_code:string|null; assigned_agent_id:string|null; created_at:string; updated_at:string; completed_at:string|null };
type Lead = { id:string; name:string; contact:string; source:string; stage:string; notes:string; next_action:string; created_at:string };
type McpToken = { id:string; label:string; scopes:string[]; revoked_at:string|null; created_at:string; last_used_at:string|null };

const providerNames:Record<string,string> = {openai:"OpenAI",anthropic:"Anthropic / Claude",openrouter:"OpenRouter"};
const industries = ["Home services & trades","Wholesale & distribution","Local services","E-commerce","AI & software","Creative studio","Marketing agency","Media & publishing","Education","Consulting","Developer tools","Finance & operations","Other"];

export default function CompanyPage() {
  const [companies,setCompanies] = useState<Company[]>([]);
  const [companyId,setCompanyId] = useState("");
  const [connections,setConnections] = useState<Connection[]>([]);
  const [agents,setAgents] = useState<Agent[]>([]);
  const [selectedAgentId,setSelectedAgentId] = useState("");
  const [artifacts,setArtifacts] = useState<Artifact[]>([]);
  const [tasks,setTasks] = useState<CompanyTask[]>([]);
  const [leads,setLeads] = useState<Lead[]>([]);
  const [leadName,setLeadName] = useState("");
  const [leadContact,setLeadContact] = useState("");
  const [leadNotes,setLeadNotes] = useState("");
  const [leadNextAction,setLeadNextAction] = useState("");
  const [mcpTokens,setMcpTokens] = useState<McpToken[]>([]);
  const [mcpLabel,setMcpLabel] = useState("ChatGPT / Claude company connector");
  const [newMcpToken,setNewMcpToken] = useState("");
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
  const [employeeInstructions,setEmployeeInstructions] = useState("Turn goals into sequenced actions, identify dependencies and risks, track assumptions, and return concise recommendations with measurable next steps.");
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
    if (!id) { setConnections([]); setAgents([]); setArtifacts([]); setTasks([]); return; }
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
    const loadedAgents = (agentData.agents ?? []) as Agent[];
    setAgents(loadedAgents);
    setSelectedAgentId((current) => loadedAgents.some((agent) => agent.id === current && agent.status === "active") ? current : loadedAgents.find((agent) => agent.status === "active" && agent.runtime === "provider")?.id ?? "");
    setArtifacts(workData.artifacts ?? []);
    setTasks(workData.tasks ?? []);
  },[]);
  const loadLeads = useCallback(async (id:string) => {
    if(!id){setLeads([]);return;}
    const response=await fetch("/api/company/leads?companyId="+encodeURIComponent(id),{cache:"no-store"});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error??"Leads unavailable.");
    setLeads(data.leads??[]);
  },[]);
  async function addLead() {
    if(!companyId)return;
    setBusy(true);setError("");setNotice("");
    try {
      await submitJson("/api/company/leads",{companyId,name:leadName,contact:leadContact,notes:leadNotes,nextAction:leadNextAction});
      setLeadName("");setLeadContact("");setLeadNotes("");setLeadNextAction("");
      await loadLeads(companyId);setNotice("Lead saved to your company pipeline.");
    } catch(e){setError(e instanceof Error?e.message:"Lead could not be saved.");}
    finally{setBusy(false);}
  }
  async function saveLeadFollowUp(lead:Lead,nextAction:string) {
    if(!companyId)return;
    setBusy(true);setError("");setNotice("");
    try {
      const response=await fetch("/api/company/leads",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({companyId,leadId:lead.id,stage:lead.stage,nextAction})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error??"Follow-up could not be saved.");
      setLeads(items=>items.map(item=>item.id===lead.id?{...item,...data.lead}:item));
      setNotice("Follow-up action saved.");
    } catch(e){setError(e instanceof Error?e.message:"Follow-up could not be saved.");}
    finally{setBusy(false);}
  }
  async function changeLeadStage(lead:Lead,stage:string) {
    if(!companyId)return;
    setBusy(true);setError("");setNotice("");
    try {
      const response=await fetch("/api/company/leads",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({companyId,leadId:lead.id,stage,nextAction:lead.next_action})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error??"Lead update failed.");
      setLeads(items=>items.map(item=>item.id===lead.id?{...item,...data.lead}:item));
      setNotice("Lead stage updated.");
    } catch(e){setError(e instanceof Error?e.message:"Lead update failed.");}
    finally{setBusy(false);}
  }
  const loadMcpTokens = useCallback(async (id:string) => {
    if (!id) { setMcpTokens([]); return; }
    try {
      const response = await fetch("/api/company/mcp-tokens?companyId="+encodeURIComponent(id),{cache:"no-store"});
      const data = await response.json();
      if (response.ok) setMcpTokens((data.tokens ?? []) as McpToken[]);
    } catch { /* Optional until the company MCP migration is deployed. */ }
  },[]);
  useEffect(() => { loadCompanies().catch((e:unknown)=>setError(e instanceof Error?e.message:"Company service unavailable.")); },[loadCompanies]);
  useEffect(() => { if(companyId) { loadCompanyData(companyId).catch((e:unknown)=>setError(e instanceof Error?e.message:"Company data unavailable.")); loadMcpTokens(companyId); loadLeads(companyId).catch((e:unknown)=>setError(e instanceof Error?e.message:"Leads unavailable.")); } },[companyId,loadCompanyData,loadMcpTokens,loadLeads]);

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
  async function createMcpToken() {
    if(!companyId)return;
    setBusy(true);setError("");setNotice("");setNewMcpToken("");
    try {
      const data = await submitJson("/api/company/mcp-tokens",{companyId,label:mcpLabel});
      setNewMcpToken(data.token as string);
      await loadMcpTokens(companyId);
      setNotice("Company-scoped MCP connection created. Copy the token now; it cannot be retrieved again.");
    } catch(e) { setError(e instanceof Error?e.message:"MCP connection could not be created."); }
    finally { setBusy(false); }
  }
  async function revokeMcpToken(tokenId:string) {
    if(!companyId)return;
    setBusy(true);setError("");setNotice("");
    try {
      const response = await fetch("/api/company/mcp-tokens",{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({companyId,tokenId})});
      const data = await response.json();
      if(!response.ok) throw new Error(data.error ?? "Access could not be revoked.");
      await loadMcpTokens(companyId);setNotice("External assistant access revoked.");
      if(newMcpToken) setNewMcpToken("");
    } catch(e) { setError(e instanceof Error?e.message:"MCP access could not be revoked."); }
    finally { setBusy(false); }
  }
  async function addEmployee() {
    if(!companyId)return;
    setBusy(true);setError("");setNotice("");
    try {
      const connection = connections.find((item)=>item.provider===employeeProvider && item.status==="connected" && item.auth_method==="api_key");
      const data = await submitJson("/api/company/agents",{companyId,name:employeeName,role:employeeRole,description:"AI employee assigned by the company owner.",runtime:connection?"provider":"eidolon",provider:connection?employeeProvider:null,connectionId:connection?.id,model:connection?model:"",instructions:employeeInstructions.trim()});
      setAgents((items)=>[data.agent,...items]);setNotice(connection?"AI employee created with a connected provider.":"Native EIDOLON employee profile created as a draft; connect a provider to execute model-powered tasks.");
    } catch(e) { setError(e instanceof Error?e.message:"Employee could not be created."); } finally { setBusy(false); }
  }
  async function setAgentStatus(agent:Agent,status:"active"|"paused"|"draft") {
    if(!companyId)return;
    setBusy(true);setError("");setNotice("");
    try {
      const response = await fetch("/api/company/agents",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({companyId,agentId:agent.id,status})});
      const data = await response.json();
      if(!response.ok)throw new Error(data.error??"Employee status could not be updated.");
      setAgents((items)=>items.map((item)=>item.id===agent.id?{...item,...data.agent}:item));
      if(status==="active")setSelectedAgentId(agent.id);
      else if(selectedAgentId===agent.id)setSelectedAgentId("");
      setNotice(status==="active"?agent.name+" is active and ready for assigned tasks.":agent.name+" is now "+status+".");
    } catch(e) { setError(e instanceof Error?e.message:"Employee status could not be updated."); }
    finally { setBusy(false); }
  }
  async function executeQueuedTask(task:CompanyTask) {
    if(!companyId)return;
    const agent = agents.find((item)=>item.id===selectedAgentId && item.status==="active" && item.runtime==="provider");
    if(!agent){setError("Activate and select an AI employee before running queued work.");return;}
    const connection = connections.find((item)=>item.id===agent.connection_id && item.status==="connected" && item.auth_method==="api_key");
    if(!connection){setError("The selected employee's provider connection needs attention. Reconnect it before running tasks.");return;}
    setBusy(true);setError("");setNotice("");setResult("");
    try {
      const data = await submitJson("/api/company/generate",{companyId,taskId:task.id,agentId:agent.id,connectionId:connection.id,model:agent.model??model,title:task.title,taskType:task.task_type,prompt:task.objective});
      setResult(data.result ?? "");await loadCompanyData(companyId);setNotice(agent.name+" completed the queued task and saved its deliverable.");
    } catch(e) { setError(e instanceof Error?e.message:"Queued task execution failed."); }
    finally { setBusy(false); }
  }
  async function generate() {
    if(!companyId)return;
    const agent = agents.find((item)=>item.id===selectedAgentId && item.status==="active" && item.runtime==="provider");
    if(!agent){setError("Activate a provider-backed AI employee before assigning work.");return;}
    const connection = connections.find((item)=>item.id===agent.connection_id && item.status==="connected" && item.auth_method==="api_key");
    if(!connection){setError("The selected employee's provider connection needs attention. Reconnect it before running tasks.");return;}
    setBusy(true);setError("");setNotice("");setResult("");
    try {
      const data = await submitJson("/api/company/generate",{companyId,agentId:agent.id,connectionId:connection.id,model:agent.model??model,title:taskTitle,taskType,prompt});
      setResult(data.result ?? "");await loadCompanyData(companyId);setNotice(agent.name+" completed the task and the deliverable was saved to the company archive.");
    } catch(e) { setError(e instanceof Error?e.message:"Generation failed."); } finally { setBusy(false); }
  }

  const selectedCompany = companies.find((item)=>item.id===companyId);
  return <main className="surface company-foundry">
    <EidolonNav section="company" />
    <header className="company-hero">
      <div className="eyebrow">EIDOLON / COMPANY FOUNDRY</div>
      <div className="company-hero-grid"><div><h1>Launch a company.<br/><em>Find customers. Do the work.</em></h1><p>Build a real operating business with customer acquisition, marketing, service delivery, and a team of people and AI working together. From plumbers and mechanics to wholesalers and software companies.</p></div><div className="company-orbit" aria-hidden="true"><span/><span/><span/><i>EC</i></div></div>
      <div className="company-truth"><span className="status-dot"/> REAL COMPANY RECORDS <span>·</span> REAL PROVIDER CALLS <span>·</span> NO SIMULATED REVENUE OR EMPLOYEES</div>
    </header>

    {error && <div className="company-alert error" role="alert">{error}</div>}
    {notice && <div className="company-alert success" role="status">{notice}</div>}

    <section className="company-section">
      <div className="company-section-head"><div><div className="eyebrow">01 / FOUNDING</div><h2>Company blueprint</h2></div><span>IDENTITY · MISSION · BUSINESS MODEL</span></div>
      <div className="company-layout">
        <form className="company-form" onSubmit={(event)=>{event.preventDefault();void createCompany();}}>
          <label>Company name<input value={name} onChange={(e)=>setName(e.target.value)} minLength={2} maxLength={120} required placeholder="e.g. Northstar Electrical Services"/></label>
          <label>Industry<select value={industry} onChange={(e)=>setIndustry(e.target.value)}>{industries.map((item)=><option key={item}>{item}</option>)}</select></label>
          <label>Mission and what it will do<textarea value={mission} onChange={(e)=>setMission(e.target.value)} minLength={10} maxLength={4000} required rows={4} placeholder="What do you sell or do, who needs it, where do you operate, and why will customers choose you?"/></label>
          <label>Business model<input value={businessModel} onChange={(e)=>setBusinessModel(e.target.value)} maxLength={240} placeholder="Service calls, wholesale, subscriptions, projects…"/></label>
          <label>Target customers<input value={targetCustomer} onChange={(e)=>setTargetCustomer(e.target.value)} maxLength={1000} placeholder="Homeowners, property managers, workshops, retailers…"/></label>
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
      <div className="company-section-head"><div><div className="eyebrow">02B / EXTERNAL INTELLIGENCE</div><h2>Connect ChatGPT or Claude</h2></div><span>SCOPED MCP CONNECTION</span></div>
      <div className="company-connect-layout">
        <div className="company-connect-copy">
          <p>Connect this company's workspace to an assistant that supports remote MCP. ChatGPT or Claude can read the company overview, review saved deliverables, queue work, and save content it creates directly into the EIDOLON archive.</p>
          <p className="company-muted">This connection exposes EIDOLON tools to ChatGPT/Claude; it does not import a private Custom GPT or Claude Project as an autonomous runtime inside EIDOLON. For AI employees that execute inside EIDOLON, connect an official provider API above. Never paste your ChatGPT or Claude account password here.</p>
          <div className="company-endpoint"><span>MCP ENDPOINT</span><code>{typeof window !== "undefined" ? window.location.origin : ""}/api/mcp/company</code></div>
        </div>
        <form className="company-form company-connect-form" onSubmit={(event)=>{event.preventDefault();void createMcpToken();}}>
          <label>Connection label<input value={mcpLabel} onChange={(e)=>setMcpLabel(e.target.value)} minLength={2} maxLength={100} required/></label>
          <button className="primary" disabled={busy}>{busy?"Creating…":"Create secure MCP connection"} <span>↗</span></button>
        </form>
      </div>
      {newMcpToken && <div className="company-mcp-token" role="status"><strong>Copy this token now</strong><p>It is shown only once. Store it in the external assistant's secure connector configuration.</p><code>{newMcpToken}</code><button type="button" className="quiet-button" onClick={()=>navigator.clipboard.writeText(newMcpToken)}>Copy token</button><div className="company-muted">Use the endpoint above with this bearer token. Revoke it here if it is exposed.</div></div>}
      <div className="company-connection-list">{mcpTokens.length===0?<span className="company-muted">No external assistant tokens recorded. Create one to enable the MCP connection.</span>:mcpTokens.map((token)=><div key={token.id} className="company-connection"><span className="company-provider-mark">M</span><span><b>{token.label}</b><small>{token.scopes.join(" · ")} · created {new Date(token.created_at).toLocaleDateString()}</small></span><span className={"company-status "+(!token.revoked_at?"live":"")}>{token.revoked_at?"revoked":token.last_used_at?"used":"active"}</span>{!token.revoked_at&&<button type="button" className="quiet-button" disabled={busy} onClick={()=>void revokeMcpToken(token.id)}>Revoke</button>}</div>)}</div>
      <div className="company-muted">Setup: add a remote MCP/custom connector in ChatGPT or Claude, use the endpoint above, select bearer-token authentication, and paste the token. Exact UI and availability depend on your plan and provider's current connector support.</div>
    </section>

    <section className="company-section">
      <div className="company-section-head"><div><div className="eyebrow">03 / ORGANIZATION</div><h2>AI employees</h2></div><span>ROLE · INSTRUCTIONS · PROVIDER</span></div>
      <div className="company-workforce-layout"><form className="company-form" onSubmit={(event)=>{event.preventDefault();void addEmployee();}}>
        <label>Employee name<input value={employeeName} onChange={(e)=>setEmployeeName(e.target.value)} minLength={2} maxLength={100} required/></label>
        <label>Role<input value={employeeRole} onChange={(e)=>setEmployeeRole(e.target.value)} minLength={2} maxLength={120} required/></label>
        <label>Employee instructions<textarea value={employeeInstructions} onChange={(e)=>setEmployeeInstructions(e.target.value)} rows={3} maxLength={8000} required/></label>
        <label>Preferred provider<select value={employeeProvider} onChange={(e)=>{setEmployeeProvider(e.target.value);setModel(e.target.value==="anthropic"?"claude-sonnet-4-5":e.target.value==="openrouter"?"openai/gpt-4.1-mini":"gpt-4.1-mini");}}><option value="openai">OpenAI</option><option value="anthropic">Anthropic / Claude</option><option value="openrouter">OpenRouter</option></select></label>
        <label>Model ID<input value={model} onChange={(e)=>setModel(e.target.value)} maxLength={160} required placeholder="Exact model ID from provider"/></label>
        <button className="primary" disabled={busy}>{busy?"Saving…":"Add AI employee"} <span>↗</span></button>
      </form>
      <div className="company-agent-list">{agents.length===0?<div className="company-empty"><span>⌘</span><strong>Your workforce starts here</strong><p>Create role profiles and assign connected model providers. Activate a provider-backed employee to execute work.</p></div>:agents.map((agent)=><article key={agent.id} className="company-agent"><div className="company-agent-icon">{agent.runtime==="provider"?"✳":"◇"}</div><div className="company-agent-main"><div className="company-agent-top"><strong>{agent.name}</strong><span className={"company-status "+(agent.status==="active"?"live":"")}>{agent.status}</span></div><span>{agent.role}</span><small>{agent.runtime==="provider"?providerNames[agent.provider??""]+" · "+(agent.model??"Model not set"):"Native EIDOLON profile · provider needed for model execution"}</small></div><div className="company-agent-actions">{agent.status==="active"?<button type="button" className="quiet-button" disabled={busy} onClick={()=>void setAgentStatus(agent,"paused")}>Pause</button>:<button type="button" className="quiet-button" disabled={busy||agent.runtime!=="provider"} onClick={()=>void setAgentStatus(agent,"active")}>Activate</button>}</div></article>)}</div></div>
    </section>

    <section className="company-section">
      <div className="company-section-head"><div><div className="eyebrow">04 / CUSTOMER PIPELINE</div><h2>Real leads. Real follow-through.</h2></div><span>OWNER-MANAGED · PERSISTED RECORDS</span></div>
      <div className="company-generation-layout">
        <form className="company-form" onSubmit={(event)=>{event.preventDefault();void addLead();}}>
          <label>Customer or organization<input value={leadName} onChange={(e)=>setLeadName(e.target.value)} minLength={2} maxLength={160} required placeholder="e.g. Riverside Property Management"/></label>
          <label>Contact detail<input value={leadContact} onChange={(e)=>setLeadContact(e.target.value)} maxLength={320} placeholder="Email or phone, if provided"/></label>
          <label>Enquiry or opportunity<textarea value={leadNotes} onChange={(e)=>setLeadNotes(e.target.value)} maxLength={4000} rows={3} placeholder="What does this customer need?"/></label>
          <label>Next follow-up action<input value={leadNextAction} onChange={(e)=>setLeadNextAction(e.target.value)} maxLength={500} placeholder="e.g. Call to confirm requirements"/></label>
          <button className="primary" disabled={busy}>{busy?"Saving…":"Add real lead"} <span>↗</span></button>
        </form>
        <div className="company-archive"><div className="eyebrow">PIPELINE / {leads.length} SAVED LEADS</div>
          {leads.length===0?<p className="company-muted">No leads recorded. Add a genuine enquiry or prospect; EIDOLON does not fabricate customers.</p>:leads.map((lead)=><article className="company-artifact" key={lead.id}><div><b>{lead.name}</b><small>{lead.contact||"No contact provided"} · {lead.source} · {new Date(lead.created_at).toLocaleDateString()}</small>{lead.notes&&<p>{lead.notes}</p>}<form onSubmit={(event)=>{event.preventDefault();const data=new FormData(event.currentTarget);void saveLeadFollowUp(lead,String(data.get("nextAction")??""));}}><label>Next follow-up<input name="nextAction" key={lead.id+lead.next_action} defaultValue={lead.next_action} maxLength={500} placeholder="Next call, quote or reminder"/></label><button type="submit" className="quiet-button" disabled={busy}>Save follow-up</button></form></div><label>Stage<select aria-label={"Stage for "+lead.name} value={lead.stage} disabled={busy} onChange={(event)=>void changeLeadStage(lead,event.target.value)}>{["new","contacted","qualified","quoted","won","lost"].map(stage=><option key={stage} value={stage}>{stage}</option>)}</select></label></article>)}
        </div>
      </div>
      <p className="company-muted">A pipeline record is not proof of contact, a booking, a payment or a completed job. Those require separate real-world confirmation.</p>
    </section>

    <section className="company-section">
      <div className="company-section-head"><div><div className="eyebrow">05 / OPERATIONS</div><h2>Plan, research and create</h2></div><span>PROVIDER-EXECUTED DELIVERABLES</span></div>
      <div className="company-generation-layout"><form className="company-form" onSubmit={(event)=>{event.preventDefault();void generate();}}>
        <label>Assigned AI employee<select value={selectedAgentId} onChange={(e)=>setSelectedAgentId(e.target.value)} required><option value="">Choose an active employee</option>{agents.filter((agent)=>agent.status==="active"&&agent.runtime==="provider").map((agent)=><option key={agent.id} value={agent.id}>{agent.name} · {agent.role}</option>)}</select></label>
        <label>Task title<input value={taskTitle} onChange={(e)=>setTaskTitle(e.target.value)} minLength={2} maxLength={180} required/></label>
        <label>Work type<select value={taskType} onChange={(e)=>setTaskType(e.target.value)}><option value="planning">Company planning</option><option value="research">Research brief</option><option value="content">Content creation</option><option value="marketing">Marketing campaign</option><option value="customer_acquisition">Find customers & build a pipeline</option><option value="sales">Sales, quotes & follow-ups</option><option value="service_operations">Service delivery & job operations</option><option value="product">Product strategy</option><option value="coding">Coding / technical brief</option><option value="operations">Operations workflow</option><option value="general">General task</option></select></label>
        <label>Instructions<textarea value={prompt} onChange={(e)=>setPrompt(e.target.value)} rows={5} minLength={5} maxLength={12000} required/></label>
        <button className="primary" disabled={busy}>{busy?"Executing real provider call…":"Run task & save deliverable"} <span>↗</span></button>
      </form><div className="company-output"><div className="company-output-head"><span>DELIVERABLE PREVIEW</span><span>{result?"GENERATED":"AWAITING TASK"}</span></div>{result?<pre>{result}</pre>:<div className="company-empty"><span>✳</span><strong>Work becomes an artifact</strong><p>Company context and your instructions are sent to the selected connected provider. The returned output is saved to the company archive.</p></div>}</div></div>
      <div className="company-archive company-task-queue"><div className="eyebrow">WORK QUEUE / ASSIGNED OPERATIONS</div>{tasks.length===0?<p className="company-muted">No company tasks yet. Tasks queued from a connected ChatGPT or Claude assistant will appear here.</p>:tasks.map((task)=><article className="company-artifact company-task-row" key={task.id}><div><b>{task.title}</b><small>{task.task_type} · {task.status} · {new Date(task.created_at).toLocaleString()}</small>{task.status==="failed"&&task.error_code&&<small>Failure: {task.error_code}</small>}</div>{task.status==="queued"?<button type="button" className="quiet-button" disabled={busy||!agents.some((agent)=>agent.id===selectedAgentId&&agent.status==="active"&&agent.runtime==="provider")} onClick={()=>void executeQueuedTask(task)}>Run with selected employee</button>:task.status==="completed"&&task.result?<button type="button" className="quiet-button" onClick={()=>setResult(task.result??"")}>View result</button>:<span className="company-status">{task.status}</span>}</article>)}</div>
      <div className="company-archive"><div className="eyebrow">COMPANY ARCHIVE / RECENT ARTIFACTS</div>{artifacts.length===0?<p className="company-muted">No deliverables recorded yet.</p>:artifacts.map((artifact)=><article className="company-artifact" key={artifact.id}><div><b>{artifact.title}</b><small>{artifact.artifact_type} · {artifact.source_provider??"provider"} · {new Date(artifact.created_at).toLocaleString()}</small></div><button type="button" className="quiet-button" onClick={()=>setResult(artifact.body)}>Open</button></article>)}</div>
    </section></>}
    <footer><span>EIDOLON / COMPANY FOUNDRY</span><span>LAUNCH · STAFF · OPERATE</span></footer>
  </main>;
}
