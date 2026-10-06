import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";
import { createProjectSlug, type ProjectAction, type SourceKind } from "@/lib/eidolon";

const defaultActions: ProjectAction[] = ["use", "follow", "contribute"];

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

export async function POST(request: Request) {
  const accessToken = (await cookies()).get("eidolon_access_token")?.value;
  if (!accessToken) return NextResponse.json({ error: "Sign in before launching a project." }, { status: 401 });
  const draft = await request.json();
  const name = typeof draft.name === "string" ? draft.name.trim() : "";
  const source = typeof draft.source === "string" ? draft.source.trim() : "";
  const description = typeof draft.description === "string" ? draft.description.trim() : "";
  if (!draft.type || name.length < 2 || source.length < 4 || description.length < 10)
    return NextResponse.json({ error: "Project identity is incomplete." }, { status: 400 });

  const headers = { ...supabaseHeaders, Authorization: "Bearer " + accessToken, Prefer: "return=representation" };
  const slug = createProjectSlug(name);
  const projectResponse = await fetch(supabaseUrl + "/rest/v1/projects", {
    method: "POST", headers,
    body: JSON.stringify({ name, slug, type: draft.type, description, economy: draft.economy === "token" ? "token" : "none", verification_status: "pending" }),
  });
  if (!projectResponse.ok) {
    const detail = await projectResponse.text();
    return NextResponse.json({ error: detail.includes("duplicate") ? "A project with this name already exists. Choose a different name." : "Project could not be created." }, { status: projectResponse.status });
  }
  const [project] = await projectResponse.json() as Array<{id:string}>;
  const sourceResponse = await fetch(supabaseUrl + "/rest/v1/project_sources", {
    method: "POST", headers,
    body: JSON.stringify({ project_id: project.id, kind: sourceKindFor(String(draft.type), source), reference: source, status: "pending" }),
  });
  const economyResponse = await fetch(supabaseUrl + "/rest/v1/project_economies", {
    method: "POST", headers,
    body: JSON.stringify({ project_id: project.id, mode: draft.economy === "token" ? "token" : "none" }),
  });
  const actionsResponse = await fetch(supabaseUrl + "/rest/v1/project_actions", {
    method: "POST", headers,
    body: JSON.stringify(defaultActions.map((action) => ({ project_id: project.id, action, enabled: true }))),
  });
  if (!sourceResponse.ok || !economyResponse.ok || !actionsResponse.ok)
    return NextResponse.json({ error: "Project was created, but its supporting records could not all be attached." }, { status: 502 });
  return NextResponse.json({ project });
}
