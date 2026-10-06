"use client";
import { useEffect, useMemo, useState } from "react";
import { discoveryFilters } from "@/lib/eidolon";
import { discoveryMatches, discoverySort, type DiscoveryProject, visibleMetric } from "@/lib/discovery";

export default function Discover() {
  const [filter, setFilter] = useState<(typeof discoveryFilters)[number]>("Trending");
  const [q, setQ] = useState("");
  const [projects, setProjects] = useState<DiscoveryProject[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/discover", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Discovery data could not be loaded.");
        return response.json();
      })
      .then((data) => { setProjects(data.projects ?? []); setAuthenticated(Boolean(data.authenticated)); })
      .catch((err) => setError(err instanceof Error ? err.message : "Discovery data could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const filtered = projects.filter((project) => discoveryMatches(project, q));
    return discoverySort(filtered, filter);
  }, [filter, q, projects]);

  return <main className="discover discover-experience">
    <header className="surface-nav"><a href="/" className="wordmark">EIDOLON</a><nav className="surface-nav-links"><a href="/discover">Discover</a><a href="/launch">Launch</a><span>DISCOVER</span></nav></header>
    <div className="discover-atmosphere" aria-hidden="true"><span/><span/><span/><i/></div><section className="discover-head"><div><div className="eyebrow">THE NETWORK</div><h1>Find what the world<br/><em>is building.</em></h1></div><a className="launch-link" href="/launch">+ Launch something</a></section>
    <div className="toolbar"><div className="filters">{discoveryFilters.map((x) => <button className={filter === x ? "filter active" : "filter"} onClick={() => setFilter(x)} key={x}>{x}</button>)}</div><input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects"/></div>
    {loading && <div className="panel"><span className="eyebrow">LOADING NETWORK</span><h2>Reading verified projects.</h2></div>}
    {!loading && error && <div className="panel"><span className="eyebrow">NETWORK UNAVAILABLE</span><h2>Discovery could not load.</h2><p>{error}</p></div>}
    {!loading && !error && <section className="project-grid">{visible.map((p) => <article className="project-card" key={p.id}><div className="card-sigil" aria-hidden="true">{p.type.slice(0,1).toUpperCase()}</div>
      <div className="card-top"><span>{p.type}</span><span>◈</span></div>
      <h2><a href={`/project?slug=${encodeURIComponent(p.slug)}`}>{p.name}</a></h2>
      <div className="verified">{p.source.kind.toUpperCase()} · {p.source.status.toUpperCase()}</div>
      <p>{p.description}</p>
      <div className="stats">{p.followerCount === null && p.usageCount === null ? "Live metrics pending" : `${visibleMetric(p.followerCount)} followers · ${visibleMetric(p.usageCount)} uses`}</div>
      <div className="card-actions">{p.actions.slice(0, 3).map((action) => <button key={action}>{action.replace("_", " ")}</button>)}</div>
    </article>)}</section>}
    {!loading && !error && visible.length === 0 && <div className="panel"><span className="eyebrow">{filter === "Following" && !authenticated ? "SIGN IN REQUIRED" : "NOTHING HERE YET"}</span><h2>{filter === "Following" && !authenticated ? "Sign in to see your followed projects." : filter === "Following" ? "No followed projects yet." : "No matching projects."}</h2><p>{filter === "Following" && !authenticated ? "Your follows are private to your account." : "EIDOLON does not invent activity. Verified data will appear as the network grows."}</p></div>}
  </main>;
}
