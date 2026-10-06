import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const modePattern = /^(none|token)$/;

async function authHeaders() {
  const token = (await cookies()).get("eidolon_access_token")?.value;
  return token ? { ...supabaseHeaders, Authorization: "Bearer " + token } : null;
}

export async function PATCH(request: NextRequest) {
  const headers = await authHeaders();
  if (!headers) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await request.json().catch(() => null) as { projectId?: string; mode?: string } | null;
  const projectId = body?.projectId?.trim() ?? "";
  const mode = body?.mode?.trim() ?? "";
  if (!uuidPattern.test(projectId)) return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  if (!modePattern.test(mode)) return NextResponse.json({ error: "Invalid economy mode." }, { status: 400 });

  const project = await fetch(
    supabaseUrl + "/rest/v1/projects?select=id,owner_id,economy&id=eq." + encodeURIComponent(projectId) + "&limit=1",
    { headers, cache: "no-store" },
  );
  if (!project.ok) return NextResponse.json({ error: "Project could not be loaded." }, { status: 502 });
  const rows = await project.json() as Array<{ id: string; owner_id: string; economy: "none" | "token" }>;
  if (!rows[0]) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const updateProject = await fetch(supabaseUrl + "/rest/v1/projects?id=eq." + encodeURIComponent(projectId), {
    method: "PATCH",
    headers: { ...headers, "content-type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ economy: mode }),
  });
  if (!updateProject.ok) return NextResponse.json({ error: "Economy could not be updated." }, { status: updateProject.status === 403 ? 403 : 502 });

  const updateEconomy = await fetch(supabaseUrl + "/rest/v1/project_economies", {
    method: "POST",
    headers: { ...headers, "content-type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ project_id: projectId, mode }),
  });
  if (!updateEconomy.ok) return NextResponse.json({ error: "Economy detail could not be synchronized." }, { status: 502 });

  return NextResponse.json({ economy: mode });
}