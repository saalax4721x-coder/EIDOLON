import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";
import { createProjectSlug, projectTypes, type ProjectAction, type ProjectType, type SourceKind } from "@/lib/eidolon";

const validTypes = new Set<string>(projectTypes);
const githubReference = /^(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?\/?$/i;
const httpReference = /^https?:\/\/[^\s]+$/i;
const uuidReference = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function isProjectRecord(value: unknown): value is {
  id: string;
  name: string;
  slug: string;
  type: ProjectType;
  description: string;
  economy: "none" | "token";
  verification_status: "unverified" | "pending" | "verified" | "rejected";
  created_at: string;
} {
  if (!value || typeof value !== "object") return false;
  const project = value as Record<string, unknown>;
  return (
    typeof project.id === "string" &&
    uuidReference.test(project.id) &&
    typeof project.name === "string" &&
    typeof project.slug === "string" &&
    typeof project.type === "string" &&
    validTypes.has(project.type) &&
    typeof project.description === "string" &&
    (project.economy === "none" || project.economy === "token") &&
    ["unverified", "pending", "verified", "rejected"].includes(String(project.verification_status)) &&
    typeof project.created_at === "string"
  );
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

  const slug = createProjectSlug(name);
  if (!slug) return NextResponse.json({ error: "Project name must contain letters or numbers." }, { status: 400 });

  const headers = { ...supabaseHeaders, Authorization: "Bearer " + accessToken };
  let rpcResponse: Response;
  try {
    rpcResponse = await fetch(supabaseUrl + "/rest/v1/rpc/create_project_bundle", {
      method: "POST",
      headers,
      body: JSON.stringify({
        p_name: name,
        p_slug: slug,
        p_type: type,
        p_description: description,
        p_economy: draft.economy === "token" ? "token" : "none",
        p_source_kind: sourceKindFor(type, source),
        p_source_reference: source,
        p_actions: defaultActionsFor(type),
      }),
    });
  } catch {
    return NextResponse.json({ error: "Project service is temporarily unavailable. Nothing was saved." }, { status: 503 });
  }

  if (!rpcResponse.ok) {
    const detail = await rpcResponse.text();
    if (detail.includes("duplicate") || detail.includes("23505")) {
      return NextResponse.json({ error: "A project with this name already exists. Choose a different name." }, { status: 409 });
    }
    if (detail.includes("42501") || detail.includes("authentication required")) {
      return NextResponse.json({ error: "Your session is no longer valid. Sign in again." }, { status: 401 });
    }
    return NextResponse.json({ error: "Project could not be created. Nothing was partially saved." }, { status: 502 });
  }

  let projectId: unknown;
  try {
    projectId = await rpcResponse.json();
  } catch {
    return NextResponse.json({ error: "Project creation returned an unreadable identity." }, { status: 502 });
  }

  if (typeof projectId !== "string" || !uuidReference.test(projectId)) {
    return NextResponse.json({ error: "Project creation returned an invalid identity." }, { status: 502 });
  }

  let projectResponse: Response;
  try {
    projectResponse = await fetch(
      supabaseUrl + "/rest/v1/projects?id=eq." + encodeURIComponent(projectId) + "&select=id,name,slug,type,description,economy,verification_status,created_at",
      { headers },
    );
  } catch {
    return NextResponse.json({ error: "Project was created, but could not be loaded. Retry from your project list." }, { status: 503 });
  }

  if (!projectResponse.ok) return NextResponse.json({ error: "Project was created, but could not be loaded. Retry from your project list." }, { status: 502 });

  let records: unknown;
  try {
    records = await projectResponse.json();
  } catch {
    return NextResponse.json({ error: "Project was created, but its response was invalid." }, { status: 502 });
  }

  const project = Array.isArray(records) ? records[0] : null;
  if (!isProjectRecord(project)) {
    return NextResponse.json({ error: "Project was created, but its identity could not be loaded." }, { status: 502 });
  }

  return NextResponse.json({ project });
}
