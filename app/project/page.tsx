"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EidolonIcon } from "@/components/eidolon-icon";
import {
  projectActionCapability,
  projectActionDescriptions,
  projectActionLabels,
  projectRelationshipLabels,
  type Project,
  type ProjectAction,
  type ProjectRelationship,
} from "@/lib/eidolon";

const isWebSource = (value: string) => value.startsWith("https://") || value.startsWith("http://");

const formatRecordedDate = (value: string | null | undefined) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(date) + " UTC";
};

export default function ProjectPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [economy, setEconomy] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followError, setFollowError] = useState<string | null>(null);
  const [githubMessage, setGithubMessage] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<Array<{id:string;relationship:ProjectRelationship;source_project_id:string;target_project_id:string;created_by:string;source?:{name:string;slug:string;type:string};target?:{name:string;slug:string;type:string}}>>([]);
  const [targetProjects, setTargetProjects] = useState<Array<{id:string;name:string;slug:string;type:string}>>([]);
  const [targetProjectId, setTargetProjectId] = useState("");
  const [targetProjectQuery, setTargetProjectQuery] = useState("");
  const [relationshipType, setRelationshipType] = useState<ProjectRelationship>("uses");
  const [relationshipBusy, setRelationshipBusy] = useState(false);
  const [relationshipError, setRelationshipError] = useState<string | null>(null);

  const load = () => {
    const slug = new URLSearchParams(window.location.search).get("slug");
    if (!slug) {
      setError("Missing project slug.");
      setLoading(false);
      return;
    }

    fetch("/api/project?slug=" + encodeURIComponent(slug), { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Project could not be loaded.");
        return data;
      })
      .then(async (data) => {
        setProject(data.project);
        setEconomy(data.economyDetail);
        setIsFollowing(Boolean(data.isFollowing));
        setAuthenticated(Boolean(data.authenticated));
        setIsOwner(Boolean(data.isOwner));
        setEditName(data.project.name);
        setEditDescription(data.project.description);
        setEditSlug(data.project.slug);
        const relationshipPromise = fetch("/api/project/relationships?projectId=" + encodeURIComponent(data.project.id), { cache: "no-store" })
          .then((response) => response.json().catch(() => null).then((payload) => ({ response, payload })));
        const discoveryPromise = Boolean(data.isOwner)
          ? fetch("/api/discover", { cache: "no-store" }).then((response) => response.json().catch(() => null).then((payload) => ({ response, payload })))
          : Promise.resolve(null);
        const [{ response: relationshipResponse, payload: relationshipData }, discoveryResult] = await Promise.all([relationshipPromise, discoveryPromise]);
        if (relationshipResponse.ok && Array.isArray(relationshipData?.relationships)) setRelationships(relationshipData.relationships);
        if (discoveryResult?.response.ok && Array.isArray(discoveryResult.payload?.projects)) {
          setTargetProjects(discoveryResult.payload.projects.filter((candidate: { id: string }) => candidate.id !== data.project.id));
        }
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Project could not be loaded."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("github");
    const errorCode = params.get("error");
    if (result === "verified") {
      setGithubMessage("GitHub control verified. This source is now backed by the connected account.");
    } else if (result) {
      setGithubMessage("GitHub connection completed, but this repository is still awaiting proof.");
    } else if (errorCode?.startsWith("github_")) {
      setGithubMessage("GitHub connection could not be completed. No verification claim was recorded.");
    }
    if (result || errorCode?.startsWith("github_")) {
      params.delete("github");
      params.delete("error");
      const clean = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (clean ? "?" + clean : ""));
    }
    load();
  }, []);

  const toggleFollow = async () => {
    if (!project || followBusy) return;
    if (!authenticated) {
      window.location.href = "/auth?next=" + encodeURIComponent(window.location.pathname + window.location.search);
      return;
    }

    setFollowBusy(true);
    setFollowError(null);
    try {
      const response = await fetch(
        "/api/project/follow" + (isFollowing ? "?projectId=" + encodeURIComponent(project.id) : ""),
        {
          method: isFollowing ? "DELETE" : "POST",
          headers: isFollowing ? undefined : { "content-type": "application/json" },
          body: isFollowing ? undefined : JSON.stringify({ projectId: project.id }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Follow could not be updated.");
      setIsFollowing(Boolean(data.following));
    } catch (cause) {
      setFollowError(cause instanceof Error ? cause.message : "Follow could not be updated.");
    } finally {
      setFollowBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!project || editBusy) return;
    setEditBusy(true);
    setFollowError(null);
    try {
      const response = await fetch("/api/project/edit", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: project.id, name: editName, description: editDescription, slug: editSlug }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Project could not be updated.");
      setProject({ ...project, name: data.project.name, slug: data.project.slug ?? editSlug, description: data.project.description ?? "" });
      setEditing(false);
    } catch (cause) {
      setFollowError(cause instanceof Error ? cause.message : "Project could not be updated.");
    } finally {
      setEditBusy(false);
    }
  };

  const createRelationship = async () => {
    if (!project || !isOwner || relationshipBusy) return;
    if (!targetProjectId) {
      setRelationshipError("Choose a project to connect.");
      return;
    }
    setRelationshipBusy(true);
    setRelationshipError(null);
    try {
      const response = await fetch("/api/project/relationships", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceProjectId: project.id, targetProjectId, relationship: relationshipType }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Relationship could not be recorded.");
      if (data?.relationship) {
        setRelationships((current) => [data.relationship, ...current]);
        setTargetProjectId("");
        setTargetProjectQuery("");
      }
    } catch (cause) {
      setRelationshipError(cause instanceof Error ? cause.message : "Relationship could not be recorded.");
    } finally {
      setRelationshipBusy(false);
    }
  };

  const removeRelationship = async (relationshipId: string) => {
    if (!isOwner || relationshipBusy) return;
    setRelationshipBusy(true);
    setRelationshipError(null);
    try {
      const response = await fetch("/api/project/relationships?id=" + encodeURIComponent(relationshipId), { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Relationship could not be removed.");
      setRelationships((current) => current.filter((edge) => edge.id !== relationshipId));
    } catch (cause) {
      setRelationshipError(cause instanceof Error ? cause.message : "Relationship could not be removed.");
    } finally {
      setRelationshipBusy(false);
    }
  };

  const verifySource = async () => {
    if (!project || !authenticated || verifyBusy) return;
    setVerifyBusy(true);
    setFollowError(null);
    try {
      const response = await fetch("/api/project/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await response.json();
      if (response.ok && data.status === "verified") {
        setProject({
          ...project,
          source: {
            ...project.source,
            status: "verified",
            verifiedAt: data.verifiedAt ?? new Date().toISOString(),
          },
        });
        setGithubMessage(data.message);
      } else {
        setFollowError(data.message ?? data.error ?? "Verification could not be completed.");
      }
    } catch {
      setFollowError("The verification service could not be reached.");
    } finally {
      setVerifyBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="project-page project-experience">
        <header className="surface-nav">
          <Link href="/" className="wordmark">EIDOLON</Link>
          <span>PROJECT</span>
        </header>
        <div className="project-atmosphere" aria-hidden="true"><span /><span /><span /></div>
        <section className="project-hero" aria-busy="true" aria-live="polite">
          <div className="eyebrow">LOADING PROJECT</div>
          <h1>Reading the network.</h1>
        </section>
      </main>
    );
  }

  if (error || !project) {
    return (
      <main className="project-page project-object-surface">
        <header className="surface-nav">
          <Link href="/" className="wordmark">EIDOLON</Link>
          <span>PROJECT</span>
        </header>
        <section className="project-hero project-dossier">
          <div className="eyebrow">PROJECT UNAVAILABLE</div>
          <h1>{error ?? "Project not found."}</h1>
          <p><Link href="/discover">Return to discovery →</Link></p>
        </section>
      </main>
    );
  }

  const actions = project.actions.length ? project.actions : (["use", "follow"] as ProjectAction[]);
  const useAction = actions.includes("use");
  const sourceIsLink = isWebSource(project.source.reference);

  return (
    <main className="project-page">
      <header className="surface-nav">
        <Link href="/" className="wordmark">EIDOLON</Link>
        <nav className="surface-nav-links" aria-label="Project navigation">
          <Link href="/discover">Discover</Link>
          <Link href="/launch">Launch</Link>
          <Link href="/graph">Graph</Link>
          <span aria-current="page">PROJECT / {project.name}</span>
        </nav>
      </header>

      <section className="project-hero">
        <div className="project-dossier-signal"><span className="project-dossier-icon"><EidolonIcon name="project" size={30} /></span><span className="eyebrow">
          {project.type} · {project.source.kind.toUpperCase()} · {project.source.status.toUpperCase()}
        </span><span className="project-dossier-code">OBJECT / {project.id.slice(0, 8).toUpperCase()}</span></div>
        <h1>{project.name}</h1>
        {editing ? (
          <div className="project-edit" aria-label="Edit project">
            <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={120} aria-label="Project name" />
            <input value={editSlug} onChange={(e) => setEditSlug(e.target.value.toLowerCase())} maxLength={160} aria-label="Project slug" />
            <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} maxLength={4000} aria-label="Project description" />
            <div className="step-actions"><button type="button" className="primary" onClick={saveEdit} disabled={editBusy}>{editBusy ? "Saving…" : "Save changes"}</button><button type="button" className="quiet-button" onClick={() => setEditing(false)} disabled={editBusy}>Cancel</button></div>
          </div>
        ) : <p>{project.description}</p>}

        <div className="project-actions" aria-label="Project actions">
          {isOwner && !editing && <button type="button" onClick={() => setEditing(true)}>Edit project</button>}
          {useAction && sourceIsLink && (
            <a href={project.source.reference} target="_blank" rel="noopener noreferrer" className="project-action-link">
              {projectActionLabels.use}
            </a>
          )}

          <button type="button" onClick={toggleFollow} disabled={followBusy} aria-busy={followBusy}>
            {followBusy ? "Updating…" : isFollowing ? "Following" : "Follow"}
          </button>

          {authenticated && project.source.status === "pending" && project.source.kind === "github" && (
            <>
              <a className="project-action-link" href={"/api/github/connect?projectId=" + encodeURIComponent(project.id) + "&next=" + encodeURIComponent(window.location.pathname + window.location.search)}>
                Connect GitHub
              </a>
              <button type="button" onClick={verifySource} disabled={verifyBusy} aria-busy={verifyBusy}>
                {verifyBusy ? "Verifying…" : "Verify GitHub"}
              </button>
            </>
          )}
        </div>

        {githubMessage && <p className="action-note" role="status" aria-live="polite">{githubMessage}</p>}
        {followError && <p className="action-error" role="alert">{followError}</p>}
        {!authenticated && <p className="action-note">Sign in to follow projects. Your follow is tied to your account.</p>}
      </section>

      <div className="project-dossier-rail" aria-hidden="true"><span>SOURCE</span><i/><span>ACTIONS</span><i/><span>ECONOMY</span></div>
      <section className="project-sections project-sections-enhanced">
        <article>
          <span className="eyebrow"><EidolonIcon name="verified" size={13} /> IDENTITY / SOURCE</span>
          <h2>Source identity</h2>
          <p>The source is recorded, but EIDOLON never treats a declaration as proof of ownership.</p>
          <div className="source-row"><strong>{project.source.kind.toUpperCase()}</strong><span>{project.source.status.toUpperCase()}</span></div>
          {project.source.reference && (sourceIsLink ? <p><a href={project.source.reference} target="_blank" rel="noopener noreferrer">{project.source.reference}</a></p> : <p>{project.source.reference}</p>)}
        </article>

        <article>
          <span className="eyebrow"><EidolonIcon name="graph" size={13} /> CAPABILITIES / ACTIONS</span>
          <h2>What you can do</h2>
          <div className="action-list">
            {actions.map((action) => {
              const capability = projectActionCapability(project, action, authenticated);
              return <div className="action-item" key={action}><div><strong>{projectActionLabels[action]}</strong><span>{projectActionDescriptions[action]}</span></div><em data-capability={capability.capability}>{capability.label}</em></div>;
            })}
          </div>
          <p className="action-note">EIDOLON only activates an action when the required source, account or network capability actually exists.</p>
        </article>

        <article>
          <span className="eyebrow"><EidolonIcon name="economy" size={13} /> ECONOMY / OPTIONAL</span>
          <h2>{project.economy === "token" ? "Token economy enabled" : "No token enabled"}</h2>
          <p>{project.economy === "token" ? economy?.chain ? "Economy is configured for " + economy.chain + "." : "Token configuration is persisted; chain details are not yet available." : "This project launched without a token. An economy can be activated later without changing the canonical project identity."}</p>
          <Link className="economy-link" href={"/economy?project=" + encodeURIComponent(project.slug)}>Explore economy →</Link>
        </article>

        <article className="project-provenance-panel">
          <span className="eyebrow"><EidolonIcon name="verified" size={13} /> PROVENANCE / RECORD</span>
          <h2>Why this object is here.</h2>
          <p>These timestamps describe what EIDOLON has actually recorded. They are not claims about activity that has not been observed.</p>
          <dl className="provenance-list">
            <div><dt>Object recorded</dt><dd>{formatRecordedDate(project.createdAt)}</dd></div>
            <div><dt>Source state</dt><dd>{project.source.status.toUpperCase()}</dd></div>
            <div><dt>Source verified</dt><dd>{formatRecordedDate(project.source.verifiedAt)}</dd></div>
            <div><dt>Object identifier</dt><dd>{project.id}</dd></div>
          </dl>
        </article>

        <article className="project-network-panel">
          <span className="eyebrow"><EidolonIcon name="graph" size={13} /> GRAPH / NETWORK</span>
          <h2>Connected projects</h2>
          <p>{relationships.length ? "These are recorded relationships in the live project graph." : "No recorded relationships yet. EIDOLON never invents graph edges from visual similarity or popularity."}</p>
          {isOwner && (
            <div className="relationship-composer" aria-label="Connect this project">
              <div className="relationship-composer-head">
                <div><strong>Connect this project</strong><span>Declare a real relationship from this project to another project.</span></div>
                <span>OWNER CONTROL</span>
              </div>
              <div className="relationship-composer-grid">
                <label><span>RELATIONSHIP</span><select value={relationshipType} onChange={(event) => setRelationshipType(event.target.value as ProjectRelationship)} disabled={relationshipBusy}>{Object.entries(projectRelationshipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label><span>TARGET PROJECT</span><input value={targetProjectQuery} onChange={(event) => setTargetProjectQuery(event.target.value)} placeholder="Search projects…" disabled={relationshipBusy} aria-label="Search target projects" /><select value={targetProjectId} onChange={(event) => setTargetProjectId(event.target.value)} disabled={relationshipBusy}><option value="">Choose a project…</option>{targetProjects.filter((candidate) => !targetProjectQuery.trim() || [candidate.name, candidate.slug, candidate.type].some((value) => value.toLowerCase().includes(targetProjectQuery.trim().toLowerCase()))).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.type}</option>)}</select></label>
                <button type="button" className="primary" onClick={createRelationship} disabled={relationshipBusy || !targetProjectId}>{relationshipBusy ? "Updating…" : "Record relationship"}</button>
              </div>
              {relationshipError && <p className="action-error" role="alert">{relationshipError}</p>}
              <p className="action-note">The source is always <strong>{project.name}</strong>. Only the source project owner can create a relationship.</p>
            </div>
          )}
          {relationships.length > 0 && (
            <div className="project-network-list">
              {relationships.map((edge) => {
                const connected = edge.source_project_id === project.id ? edge.target : edge.source;
                const outbound = edge.source_project_id === project.id;
                if (!connected) return null;
                return <div className="project-network-edge" key={edge.id}>
                  <Link className="project-network-node" href={"/project?slug=" + encodeURIComponent(connected.slug)}>
                    <EidolonIcon name="project" size={17} />
                    <b>{connected.name}</b>
                    <small>{connected.type}</small>
                  </Link>
                  <div className="project-network-relation"><em>{outbound ? "OUTBOUND" : "INBOUND"}</em><strong>{projectRelationshipLabels[edge.relationship]}</strong></div>
                  {outbound && isOwner ? <button type="button" className="project-network-remove" onClick={() => removeRelationship(edge.id)} disabled={relationshipBusy} aria-label={"Remove relationship with " + connected.name}>×</button> : <span className="project-network-arrow" aria-hidden="true">↗</span>}
                </div>;
              })}
            </div>
          )}
        </article></section>
    </main>
  );
}
