import { NextResponse } from "next/server";
import { supabaseUrl, supabasePublishableKey } from "@/lib/supabase-config";
import { createProjectSlug, type ProjectAction } from "@/lib/eidolon";

const defaultActions: ProjectAction[] = ["use", "follow", "contribute"];

export async function POST(request: Request) {
  const accessToken = request.headers.get("cookie")?.match(/(?:^|;\\s*)eidolon_access_token=([^;]+)/)?.[1];
  if (!accessToken) return NextResponse.json({ error: "Sign in before launching a project." }, { status: 401 });

  const draft = await request.json();
  const name = typeof draft.name === "string" ? draft.name.trim() : "";
  const source = typeof draft.source === "string" ? draft.source.trim() : "";
  const description = typeof draft.description === "string" ? draft.description.trim() : "";

  if (!draft.type || name.length < 2 || source.length < 4 || description.length < 10) {
    return NextResponse.json({ error: "Project identity is incomplete." }, { status: 400 });
  }

  const sourceKind = String(draft.type).toLowerCase().includes("github") ? "github" : "other";
  const headers = {
    apikey: supabasePublishableKey,
    Authorization: "Bearer " + accessToken,
    "content-type": "application/json",
    Prefer: "return=representation",
  };

  const projectResponse = await fetch(supabaseUrl + "/rest/v1/projects", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name,
      slug: createProjectSlug(name),
      type: draft.type,
      description,
      economy: draft.economy === "token" ? "token" : "none",
      verification_status: "pending",
    }),
  });

  if (!projectResponse.ok) {
    return NextResponse.json({ error: await projectResponse.text() }, { status: projectResponse.status });
  }

  const [project] = await projectResponse.json();
  await fetch(supabaseUrl + "/rest/v1/project_sources", {
    method: "POST",
    headers,
    body: JSON.stringify({ project_id: project.id, kind: sourceKind, reference: source, status: "pending" }),
  });
  await fetch(supabaseUrl + "/rest/v1/project_economies", {
    method: "POST",
    headers,
    body: JSON.stringify({ project_id: project.id, mode: draft.economy === "token" ? "token" : "none" }),
  });
  await fetch(supabaseUrl + "/rest/v1/project_actions", {
    method: "POST",
    headers,
    body: JSON.stringify(defaultActions.map((action) => ({ project_id: project.id, action, enabled: true }))),
  });

  return NextResponse.json({ project });
}
