"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { EidolonNav } from "@/components/eidolon-nav";

type Company={id:string;name:string;mission:string;status:string};
type Project={id:string;name:string;slug:string;description:string|null;verification_status:string};
export default function Workspace(){
  const [status,setStatus]=useState<"loading"|"ready"|"signed-out"|"error">("loading"),[email,setEmail]=useState(""),[error,setError]=useState("");
  const [companies,setCompanies]=useState<Company[]>([]),[projects,setProjects]=useState<Project[]>([]),[reload,setReload]=useState(0),[busy,setBusy]=useState(false);
  useEffect(()=>{const controller=new AbortController();setStatus("loading");setError("");
    async function load(){try{
      const session=await fetch("/api/auth/session",{cache:"no-store",signal:controller.signal});const account=await session.json();
      if(session.status===401 || (session.ok&&!account.authenticated)){setStatus("signed-out");return;}
      if(!session.ok)throw Error("Your session could not be checked. Try again shortly.");setEmail(account.user?.email||"");
      const responses=await Promise.all([fetch("/api/companies",{cache:"no-store",signal:controller.signal}),fetch("/api/account/projects",{cache:"no-store",signal:controller.signal})]);
      if(responses.some(response=>response.status===401)){setStatus("signed-out");return;}
      if(responses.some(response=>!response.ok))throw Error("Your workspace records could not be loaded. Please retry.");
      const [companyData,projectData]=await Promise.all(responses.map(response=>response.json()));
      if(!Array.isArray(companyData.companies)||!Array.isArray(projectData.projects))throw Error("Workspace returned an incomplete response. Please retry.");
      setCompanies(companyData.companies);setProjects(projectData.projects);setStatus("ready");
    }catch(error){if(!controller.signal.aborted){setError(error instanceof Error?error.message:"Workspace unavailable.");setStatus("error");}}}
    void load();return()=>controller.abort();
  },[reload]);
  async function logout(){setBusy(true);try{const response=await fetch("/api/auth/logout",{method:"POST"});if(!response.ok)throw Error();window.location.assign("/");}catch{setError("Sign-out failed. Please try again.");setBusy(false);}}
  return <main className="content-page workspace-page"><EidolonNav section="workspace"/><header className="content-head"><span className="eyebrow">YOUR WORKSPACE</span><h1>Make room for<br/><em>what comes next.</em></h1><p>{status==="ready"?`Signed in as ${email}. Your companies, projects and real work in one place.`:"A home for your companies, projects and agent workflows."}</p></header>
    {status==="loading"&&<section className="glass workspace-notice" role="status">Opening your workspace…</section>}
    {status==="signed-out"&&<section className="glass workspace-notice"><h2>Sign in to open your workspace.</h2><p>Use the newest email link in the browser where you requested it.</p><Link className="btn" href="/auth?next=/workspace">Sign in to EIDOLON ↗</Link></section>}
    {status==="error"&&<section className="glass workspace-notice"><p role="alert">{error}</p><button className="btn" onClick={()=>setReload(value=>value+1)}>Try again</button></section>}
    {status==="ready"&&<><div className="workspace-tools"><Link className="btn" href="/company">Create a company ↗</Link><Link className="btn btn--quiet" href="/launch">Launch a project</Link><button className="quiet-button" onClick={logout} disabled={busy}>{busy?"Signing out…":"Sign out"}</button></div>{error&&<p role="alert">{error}</p>}
      <nav className="workspace-shortcuts" aria-label="Workspace tools">{[["Dashboard","Company statistics and work status","/dashboard"],["Workflows","Build nodes, connect agents and review runs","/workflows"],["Marketplace","Explore sourced investors and firms","/marketplace"],["Activity","Review requests and recorded updates","/notifications"]].map(([name,description,href])=><Link className="glass workspace-shortcut" href={href} key={href}><span>↗</span><h2>{name}</h2><p>{description}</p></Link>)}</nav>
      <section className="workspace-section"><div className="section-heading"><h2>Your companies</h2><span>{companies.length} owned</span></div>{companies.length===0?<div className="glass workspace-notice"><h3>Your company starts here.</h3><p>Create a company to connect AI providers, assemble agents, track leads and run workflows.</p><Link href="/company" className="btn">Open Company Foundry ↗</Link></div>:<div className="workspace-records">{companies.map(company=><article className="glass workspace-record" key={company.id}><span className="eyebrow">{company.status}</span><h3>{company.name}</h3><p>{company.mission}</p><div className="workspace-tools"><Link href={`/company?companyId=${encodeURIComponent(company.id)}`}>Open company ↗</Link><Link href={`/dashboard?companyId=${encodeURIComponent(company.id)}`}>Statistics</Link><Link href={`/workflows?companyId=${encodeURIComponent(company.id)}`}>Workflows</Link></div></article>)}</div>}</section>
      <section className="workspace-section"><div className="section-heading"><h2>Your projects</h2><span>{projects.length} recorded</span></div>{projects.length===0?<div className="glass workspace-notice"><h3>No projects yet.</h3><p>Launch a project to give it a public identity and source record.</p><Link href="/launch">Launch your first project ↗</Link></div>:<div className="workspace-records">{projects.map(project=><Link className="glass workspace-record" href={`/project?slug=${encodeURIComponent(project.slug)}`} key={project.id}><span className="eyebrow">{project.verification_status}</span><h3>{project.name}</h3><p>{project.description||"No description yet."}</p><span>Open project ↗</span></Link>)}</div>}</section></>}
  </main>;
}
