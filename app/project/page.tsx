"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EidolonIcon } from "@/components/eidolon-icon";
import {
  projectActionCapability,
  projectActionDescriptions,
  projectActionLabels,
  type Project,
  type ProjectAction,
} from "@/lib/eidolon";

const isWebSource = (value: string) => value.startsWith("https://") || value.startsWith("http://");

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
      .then((data) => {
        setProject(data.project);
        setEconomy(data.economyDetail);
        setIsFollowing(Boolean(data.isFollowing));
        setAuthenticated(Boolean(data.authenticated));
        setIsOwner(Boolean(data.isOwner));
        setEditName(data.project.name);
        setEditDescription(data.project.description);
        setEditSlug(data.project.slug);
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
      <main className="project-page">
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

        <article>
          <span className="eyebrow">GRAPH</span><h2>Connected projects</h2><p>Dependencies, collaborators, services and compositions will appear here as the network grows.</p>
        </article>
      </section>
    </main>
  );
}
