"use client";
import { useMemo, useState } from "react";
import { discoveryFilters } from "@/lib/eidolon";
const projects=[
 {name:"NOVA",kind:"AI infrastructure",source:"GITHUB · VERIFIED",desc:"Composable inference infrastructure for builders.",stats:"2.8K followers · 31 contributors",actions:["Explore","Use","Contribute"]},
 {name:"VOIDRUNNERS",kind:"GAME",source:"GAME · VERIFIED",desc:"A persistent world built around player-owned progression.",stats:"4.2K players · 14K assets",actions:["Explore","Play","Assets"]},
 {name:"OPENVAULT",kind:"OPEN SOURCE",source:"GITHUB · VERIFIED",desc:"An open database layer for teams building in public.",stats:"1.7K contributors · 42 releases",actions:["Explore","Use","Sponsor"]},
 {name:"MIRA",kind:"API",source:"API · VERIFIED",desc:"Real-time signals for applications that need the world as data.",stats:"18K calls · 2.1K users",actions:["Explore","Use API","Docs"]},
];
export default function Discover(){
 const [filter,setFilter]=useState("Trending"); const [q,setQ]=useState("");
 const visible=useMemo(()=>projects.filter(p=>(p.name+" "+p.kind+" "+p.desc).toLowerCase().includes(q.toLowerCase())),[q]);
 return <main className="discover"><header className="surface-nav"><a href="/" className="wordmark">EIDOLON</a><span>DISCOVER</span></header><section className="discover-head"><div><div className="eyebrow">THE NETWORK</div><h1>Find what the world<br/><em>is building.</em></h1></div><a className="launch-link" href="/launch">+ Launch something</a></section><div className="toolbar"><div className="filters">{discoveryFilters.map(x=><button className={filter===x?"filter active":"filter"} onClick={()=>setFilter(x)} key={x}>{x}</button>)}</div><input className="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search projects"/></div><section className="project-grid">{visible.map(p=><article className="project-card" key={p.name}><div className="card-top"><span>{p.kind}</span><span>◈</span></div><h2><a href="/project">{p.name}</a></h2><div className="verified">{p.source}</div><p>{p.desc}</p><div className="stats">{p.stats}</div><div className="card-actions">{p.actions.map(a=><button key={a}>{a}</button>)}</div></article>)}</section></main>;
}
