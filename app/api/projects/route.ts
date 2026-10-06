import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";
import { createProjectSlug, projectTypes, type ProjectAction, type ProjectType, type SourceKind } from "@/lib/eidolon";

const validTypes = new Set<string>(projectTypes);
const githubReference = /^(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?\/?$/i;
const httpReference = /^https?:\/\/[^\s]+$/i;

function defaultActionsFor(type: string): ProjectAction[] {
  switch (type) {
    case "GitHub project":
      return ["use", "follow", "contribute", "sponsor", "bounty", "license"];
    case "API":
      return ["use", "follow", "subscribe", "license"];
    case "Dataset":
      return ["use", "follow", "license", "subscribe"];
    case "Digital asset":
      return ["use", "follow", "buy", "sell", "rent", "borrow"];
    case "Protocol":
      return ["use", "follow", "contribute", "fund", "compose"];
    case "Creator / business":
      return ["use", "follow", "subscribe", "buy", "sponsor"];
    case "AI product":
      return ["use", "follow", "subscribe", "license"];
    case "Game":
      return ["use", "follow", "buy", "sell", "rent"];
    case "Web app":
    case "App":
      return ["use", "follow", "subscribe"];
    case "Website":
      return ["use", "follow"];
    default:
      return ["use", "follow"];
  }
}

function sourceKindFor(type: string, source: string): SourceKind {
  const value = `${type} ${source}`.toLowerCase();
  if (value.includes("github") || value.includes("github.com")) return "github";
  if (/^https?:\/\/[^/]+/.test(source)) return "domain";
  if (value.includes("wallet") || value.startsWith("0x")) return "wallet";
  if (value.includes("app store")) return "app_store";
  if (value.includes("play store")) return "play_store";
  if (value.includes("game")) return "game";
  return "other";
}

function sourceIsValid(type: ProjectType, source: string) {
  if (type === "GitHub project") return githubReference.test(source);
  if (["Website", "Web app", "App", "API"].includes(type)) return httpReference.test(source);
  return source.length >= 4;
}

export async function POST(request: Request) {
  const accessToken = (await cookies()).get("eidolon_access_token")?.value;
  if (!accessToken) return NextResponse.json({ error: "Sign in before launching a project." }, { status: 401 });

  let draft: Record<string, unknown>;
  try {
    draft = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid project payload." }, { status: 400 });
  }

  const type = typeof draft.type === "string" ? draft.type : "";
  const name = typeof draft.name === "string" ? draft.name.trim() : "";
  const source = typeof draft.source === "string" ? draft.source.trim() : "";
  const description = typeof draft.description === "string" ? draft.description.trim() : "";

  if (!validTypes.has(type)) return NextResponse.json({ error: "Choose a supported project type." }, { status: 400 });
  if (name.length < 2 || name.length > 120) return NextResponse.json({ error: "Project name must be between 2 and 120 characters." }, { status: 400 });
  if (source.length < 4 || source.length > 1000) return NextResponse.json({ error: "Project source must be between 4 and 1000 characters." }, { status: 400 });
  if (description.length < 10 || description.length > 4000) return NextResponse.json({ error: "Project description must be between 10 and 4000 characters." }, { status: 400 });
  if (!sourceIsValid(type as ProjectType, source)) {
    const hint = type === "GitHub project" ? "Use a GitHub repository such as github.com/owner/repository." : "Use a valid HTTPS or HTTP source URL for this project type.";
    return NextResponse.json({ error: hint }, { status: 400 });
  }

  const headers = { ...supabaseHeaders, Authorization: "Bearer " + accessToken, Prefer: "return=representation" };
  const slug = createProjectSlug(name);
  if (!slug) return NextResponse.json({ error: "Project name must contain letters or numbers." }, { status: 400 });

  const projectResponse = await fetch(supabaseUrl + "/rest/v1/projects", {
    method: "POST", headers,
    body: JSON.stringify({ name, slug, type, description, economy: draft.economy === "token" ? "token" : "none", verification_status: "pending" }),
  });
  if (!projectResponse.ok) {
    const detail = await projectResponse.text();
    return NextResponse.json({ error: detail.includes("duplicate") ? "A project with this name already exists. Choose a different name." : "Project could not be created." }, { status: projectResponse.status });
  }
  const [project] = await projectResponse.json() as Array<{id:string}>;
  if (!project?.id) return NextResponse.json({ error: "Project was created without an identity." }, { status: 502 });

  const sourceResponse = await fetch(supabaseUrl + "/rest/v1/project_sources", {
    method: "POST", headers,
    body: JSON.stringify({ project_id: project.id, kind: sourceKindFor(type, source), reference: source, status: "pending" }),
  });
  const economyResponse = await fetch(supabaseUrl + "/rest/v1/project_economies", {
    method: "POST", headers,
    body: JSON.stringify({ project_id: project.id, mode: draft.economy === "token" ? "token" : "none" }),
  });
  const actionsResponse = await fetch(supabaseUrl + "/rest/v1/project_actions", {
    method: "POST", headers,
    body: JSON.stringify(defaultActionsFor(type).map((action) => ({ project_id: project.id, action, enabled: true }))),
  });
  if (!sourceResponse.ok || !economyResponse.ok || !actionsResponse.ok)
    return NextResponse.json({ error: "Project was created, but its supporting records could not all be attached." }, { status: 502 });
  return NextResponse.json({ project });
}
