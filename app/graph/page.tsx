"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EidolonIcon, type EidolonIconName } from "@/components/eidolon-icon";
import { projectRelationshipLabels, type ProjectRelationship } from "@/lib/eidolon";
import type { DiscoveryProject, DiscoveryRelationship } from "@/lib/discovery";
import { EidolonNav } from "@/components/eidolon-nav";

const typeIcons: Record<string, EidolonIconName> = {
  "GitHub project": "build", API: "graph", Protocol: "economy", Dataset: "graph",
  Website: "use", "Web app": "use", App: "use", Game: "project",
  "AI product": "discover", "Digital asset": "commerce", "Creator / business": "commerce",
};

export default function GraphPage() {
  const [projects, setProjects] = useState<DiscoveryProject[]>([]);
  const [relationships, setRelationships] = useState<DiscoveryRelationship[]>([]);
  const [relationshipFilter, setRelationshipFilter] = useState<"all" | ProjectRelationship>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "verified" | "unverified">("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/discover", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Graph data could not be loaded.");
        return data;
      })
      .then((data) => {
        setProjects(data.projects ?? []);
        setRelationships(data.relationships ?? []);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Graph data could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  const projectTypes = useMemo(() => Array.from(new Set(projects.map((project) => project.type))).sort(), [projects]);

  const visibleProjects = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesQuery = !normalized || [project.name, project.slug, project.type].some((value) => value.toLowerCase().includes(normalized));
      const matchesType = typeFilter === "all" || project.type === typeFilter;
      const matchesSource = sourceFilter === "all" || (sourceFilter === "verified" ? project.source.status === "verified" : project.source.status !== "verified");
      return matchesQuery && matchesType && matchesSource;
    }).slice(0, 24);
  }, [projects, query, typeFilter, sourceFilter]);

  const visibleIds = useMemo(() => new Set(visibleProjects.map((project) => project.id)), [visibleProjects]);
  const visibleEdges = useMemo(
    () => relationships.filter((edge) =>
      visibleIds.has(edge.sourceProjectId) &&
      visibleIds.has(edge.targetProjectId) &&
      (relationshipFilter === "all" || edge.relationship === relationshipFilter),
    ),
    [relationships, visibleIds, relationshipFilter],
  );

  const positions = useMemo(() => new Map(visibleProjects.map((project, index) => {
    const angle = index * 137.5 * Math.PI / 180;
    const radius = 15 + (index % 5) * 7;
    return [project.id, {
      left: 50 + Math.cos(angle) * radius,
      top: 50 + Math.sin(angle) * radius * 0.68,
    }];
  })), [visibleProjects]);

  return (
    <main className="graph-page">
      <EidolonNav section="graph" />

      <div className="graph-atmosphere" aria-hidden="true"><span /><span /><span /></div>

      <section className="graph-head">
        <div>
          <span className="eyebrow">THE NETWORK / GRAPH</span>
          <h1>See what is<br /><em>actually connected.</em></h1>
          <p>Every edge here is a persisted relationship between real EIDOLON projects. Nothing is inferred from popularity, visual similarity or proximity.</p>
        </div>
        <div className="graph-readout">
          <span>OBJECTS</span><strong>{projects.length}</strong>
          <span>RECORDED EDGES</span><strong>{relationships.length}</strong>
        </div>
      </section>

      <section className="graph-controls" aria-label="Graph controls">
        <label className="search-wrap">
          <EidolonIcon name="discover" size={15} />
          <input aria-label="Search graph" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search objects" />
        </label>
        <label className="graph-filter">
          <span>OBJECT TYPE</span>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">All object types</option>
            {projectTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label className="graph-filter">
          <span>SOURCE STATE</span>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as "all" | "verified" | "unverified")}>
            <option value="all">All source states</option>
            <option value="verified">Verified sources</option>
            <option value="unverified">Unverified sources</option>
          </select>
        </label>
        <label className="graph-filter">
          <span>RELATIONSHIP</span>
          <select value={relationshipFilter} onChange={(event) => setRelationshipFilter(event.target.value as "all" | ProjectRelationship)}>
            <option value="all">All recorded relationships</option>
            {Object.entries(projectRelationshipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <Link className="launch-link" href="/launch"><EidolonIcon name="launch" size={15} /> Add an object</Link>
      </section>

      {loading && <section className="panel graph-state"><span className="eyebrow">READING GRAPH</span><h2>Mapping verified objects.</h2><div className="signal-loader" aria-hidden="true"><i /><i /><i /></div></section>}
      {!loading && error && <section className="panel"><span className="eyebrow">GRAPH UNAVAILABLE</span><h2>Could not read the network.</h2><p>{error}</p></section>}

      {!loading && !error && (
        <>
          <section className="graph-field" aria-label="Persisted project graph">
            <div className="graph-field-grid" aria-hidden="true" />
            <div className="graph-field-axis" aria-hidden="true"><i /><i /><i /></div>
            <svg className="graph-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {visibleEdges.map((edge) => {
                const a = positions.get(edge.sourceProjectId);
                const b = positions.get(edge.targetProjectId);
                if (!a || !b) return null;
                return <line key={edge.id} x1={a.left} y1={a.top} x2={b.left} y2={b.top} />;
              })}
            </svg>
            {visibleProjects.map((project) => {
              const position = positions.get(project.id);
              if (!position) return null;
              return (
                <Link key={project.id} href={"/project?slug=" + encodeURIComponent(project.slug)} className={`graph-node graph-node-${typeIcons[project.type] ?? "project"}`} style={{ left: position.left + "%", top: position.top + "%" }}>
                  <span className="graph-node-core"><EidolonIcon name={typeIcons[project.type] ?? "project"} size={15} /></span>
                  <span className="graph-node-copy"><strong>{project.name}</strong><small>{project.type} · {project.source.status}</small></span>
                </Link>
              );
            })}
            <div className="graph-core"><EidolonIcon name="graph" size={24} /><span>CANONICAL<br />OBJECT GRAPH</span></div>
          </section>

          <section className="graph-ledger">
            <div className="graph-ledger-head"><span className="eyebrow">EDGE LEDGER</span><strong>{visibleEdges.length} visible relationship{visibleEdges.length === 1 ? "" : "s"}</strong></div>
            {visibleEdges.length ? (
              <div className="graph-edge-list">
                {visibleEdges.map((edge) => {
                  const source = projects.find((project) => project.id === edge.sourceProjectId);
                  const target = projects.find((project) => project.id === edge.targetProjectId);
                  if (!source || !target) return null;
                  return (
                    <div className="graph-edge-row" key={edge.id}>
                      <Link href={"/project?slug=" + encodeURIComponent(source.slug)}>{source.name}</Link>
                      <span>{projectRelationshipLabels[edge.relationship]}</span>
                      <Link href={"/project?slug=" + encodeURIComponent(target.slug)}>{target.name}</Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="action-note">No recorded edges match this view. Create a relationship from a project you control to make it part of the canonical graph.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
