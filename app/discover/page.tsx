"use client";
import { useMemo, useState } from "react";
import { discoveryFilters, type ProjectAction, type Project } from "@/lib/eidolon";
import { discoveryMatches, discoverySort, type DiscoveryProject, visibleMetric } from "@/lib/discovery";

const projects: DiscoveryProject[] = [
  { id:"nova", slug:"nova", name:"NOVA", type:"AI product", source:{kind:"github",reference:"github.com/nova",status:"verified"}, description:"Composable inference infrastructure for builders.", economy:"none", createdAt:"2026-10-05T12:00:00Z", actions:["use","contribute","sponsor"], activityScore:null, followerCount:null, usageCount:null, updatedAt:null },
  { id:"voidrunners", slug:"voidrunners", name:"VOIDRUNNERS", type:"Game", source:{kind:"game",reference:"voidrunners.example",status:"verified"}, description:"A persistent world built around player-owned progression.", economy:"token", createdAt:"2026-10-04T12:00:00Z", actions:["use","buy","sell","follow"], activityScore:null, followerCount:null, usageCount:null, updatedAt:null },
  { id:"openvault", slug:"openvault", name:"OPENVAULT", type:"GitHub project", source:{kind:"github",reference:"github.com/openvault",status:"verified"}, description:"An open database layer for teams building in public.", economy:"none", createdAt:"2026-10-03T12:00:00Z", actions:["use","sponsor","contribute","license"], activityScore:null, followerCount:null, usageCount:null, updatedAt:null },
  { id:"mira", slug:"mira", name:"MIRA", type:"API", source:{kind:"other",reference:"mira.example",status:"verified"}, description:"Real-time signals for applications that need the world as data.", economy:"none", createdAt:"2026-10-02T12:00:00Z", actions:["use","subscribe","license"], activityScore:null, followerCount:null, usageCount:null, updatedAt:null },
];

export default function Discover() {
  const [filter, setFilter] = useState<(typeof discoveryFilters)[number]>("Trending");
  const [q, setQ] = useState("");
  const visible = useMemo(() => {
    const filtered = projects.filter((project) => discoveryMatches(project, q));
    return filter === "Following" ? [] : discoverySort(filtered, filter === "Following" ? "Trending" : filter);
  }, [filter, q]);

  return <main className="discover">
    <header className="surface-nav"><a href="/" className="wordmark">EIDOLON</a><span>DISCOVER</span></header>
    <section className="discover-head"><div><div className="eyebrow">THE NETWORK</div><h1>Find what the world<br/><em>is building.</em></h1></div><a className="launch-link" href="/launch">+ Launch something</a></section>
    <div className="toolbar"><div className="filters">{discoveryFilters.map((x)=><button className={filter===x?"filter active":"filter"} onClick={()=>setFilter(x)} key={x}>{x}</button>)}</div><input className="search" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search projects"/></div>
    <section className="project-grid">{visible.map((p)=><article className="project-card" key={p.id}>
      <div className="card-top"><span>{p.type}</span><span>◈</span></div>
      <h2><a href={`/project?slug=${p.slug}`}>{p.name}</a></h2>
      <div className="verified">{p.source.kind.toUpperCase()} · {p.source.status.toUpperCase()}</div>
      <p>{p.description}</p>
      <div className="stats">{p.followerCount === null && p.usageCount === null ? "Live metrics pending" : `${visibleMetric(p.followerCount)} followers · ${visibleMetric(p.usageCount)} uses`}</div>
      <div className="card-actions">{p.actions.slice(0,3).map((action)=><button key={action}>{action.replace("_"," ")}</button>)}</div>
    </article>)}</section>
    {visible.length===0 && <div className="panel"><span className="eyebrow">NOTHING HERE YET</span><h2>No followed projects or matching results.</h2><p>EIDOLON does not invent activity. Verified data will appear as the network grows.</p></div>}
  </main>;
}
