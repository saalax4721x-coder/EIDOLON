"use client";
import { useEffect, useMemo, useState } from "react";
import { discoveryFilters } from "@/lib/eidolon";
import { discoveryMatches, discoverySort, type DiscoveryProject, visibleMetric } from "@/lib/discovery";
import { EidolonIcon, type EidolonIconName } from "@/components/eidolon-icon";

const isWebSource = (value: string) => value.startsWith("https://") || value.startsWith("http://");
const typeIcons: Record<string, EidolonIconName> = {"GitHub project":"build","API":"graph","Protocol":"economy","Dataset":"graph","Website":"use","Web app":"use","App":"use","Game":"project","AI product":"discover","Digital asset":"commerce","Creator / business":"commerce"};

export default function Discover() {
  const [filter, setFilter] = useState<(typeof discoveryFilters)[number]>("Trending");
  const [q, setQ] = useState("");
  const [intent, setIntent] = useState("");
  const [projects, setProjects] = useState<DiscoveryProject[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const requestedIntent = new URLSearchParams(window.location.search).get("intent") ?? "";
    setIntent(requestedIntent);
    fetch("/api/discover", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Discovery data could not be loaded.");
      return response.json();
    }).then((data) => { setProjects(data.projects ?? []); setAuthenticated(Boolean(data.authenticated)); }).catch((err) => setError(err instanceof Error ? err.message : "Discovery data could not be loaded.")).finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const intentTerms: Record<string, string[]> = {build:["github project","api","protocol","dataset"],commerce:["digital asset","creator / business","app","website","web app"],fund:["protocol","ai product","creator / business","github project"],use:["website","web app","app","api","game","ai product"]};
    const terms = intentTerms[intent] ?? [];
    return discoverySort(projects.filter((project) => discoveryMatches(project, q) && (!terms.length || terms.includes(project.type.toLowerCase()))), filter);
  }, [filter, q, projects, intent]);

  return <main className="discover discover-experience">
    <header className="surface-nav"><a href="/" className="wordmark">EIDOLON</a><nav className="surface-nav-links"><a href="/discover">Discover</a><a href="/launch">Launch</a><span>DISCOVER</span></nav></header>
    <div className="discover-atmosphere" aria-hidden="true"><span/><span/><span/><i/></div>
    <section className="discover-head"><div><div className="eyebrow">THE NETWORK / LIVE GRAPH</div><h1>Find what the world<br/><em>is building.</em></h1><p className="discover-manifesto">Projects are not posts. They are objects with sources, capabilities, relationships and economies.</p></div><a className="launch-link" href="/launch"><EidolonIcon name="launch" size={15}/> Launch something</a></section>
    <div className="toolbar"><div className="filters">{discoveryFilters.map((x) => <button aria-pressed={filter === x} className={filter === x ? "filter active" : "filter"} onClick={() => setFilter(x)} key={x}>{x}</button>)}</div>{intent && <div className="intent-context">INTENT / {intent.replace("_"," ").toUpperCase()} <button type="button" onClick={() => { setIntent(""); window.history.replaceState({}, "", "/discover"); }}>CLEAR</button></div>}<label className="search-wrap"><EidolonIcon name="discover" size={15}/><input aria-label="Search projects" className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the network"/></label></div>
    {loading && <div className="panel network-state"><span className="eyebrow">LOADING NETWORK</span><h2>Reading verified projects.</h2><div className="signal-loader" aria-hidden="true"><i/><i/><i/></div></div>}
    {!loading && error && <div className="panel"><span className="eyebrow">NETWORK UNAVAILABLE</span><h2>Discovery could not load.</h2><p>{error}</p></div>}
    {!loading && !error && <section className="project-grid">{visible.map((p,index) => <article className="project-card" key={p.id} style={{"--card-index":index} as React.CSSProperties}><div className="card-sigil" aria-hidden="true"><EidolonIcon name={typeIcons[p.type] ?? "project"} size={19}/></div>
      <div className="card-top"><span>{p.type}</span><span className="card-code">0{(index + 1).toString().slice(-1)} / NODE</span></div>
      <h2><a href={`/project?slug=${encodeURIComponent(p.slug)}`}>{p.name}</a></h2>
      <div className="verified"><EidolonIcon name={p.source.status === "verified" ? "verified" : "project"} size={12}/> {p.source.kind.toUpperCase()} · {p.source.status.toUpperCase()}</div>
      <p>{p.description}</p>
      <div className="stats">{p.followerCount === null && p.usageCount === null ? "Live metrics pending" : `${visibleMetric(p.followerCount)} followers · ${visibleMetric(p.usageCount)} uses`}</div>
      <div className="card-actions"><a className="project-action-link" href={`/project?slug=${encodeURIComponent(p.slug)}`}>Open project <span>↗</span></a>{isWebSource(p.source.reference) && <a className="project-action-link secondary" href={p.source.reference} target="_blank" rel="noreferrer">Source <span>↗</span></a>}</div>
    </article>)}</section>}
    {!loading && !error && visible.length === 0 && <div className="panel"><span className="eyebrow">{filter === "Following" && !authenticated ? "SIGN IN REQUIRED" : "NOTHING HERE YET"}</span><h2>{filter === "Following" && !authenticated ? "Sign in to see your followed projects." : filter === "Following" ? "No followed projects yet." : "No matching projects."}</h2><p>{filter === "Following" && !authenticated ? "Your follows are private to your account." : "EIDOLON does not invent activity. Verified data will appear as the network grows."}</p></div>}
  </main>;
}