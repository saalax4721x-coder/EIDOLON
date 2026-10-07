import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";
import type { ProjectRelationship } from "@/lib/eidolon";

export const dynamic = "force-dynamic";

const relationshipPattern = /^(uses|depends_on|forked_from|built_with|funds|competes_with|complements|licenses|provides|consumes|derived_from|composed_with|invested_in|contributes_to)$/;

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) return NextResponse.json({ error: "Missing project id." }, { status: 400 });

  const response = await fetch(
    supabaseUrl + "/rest/v1/project_relationships?select=id,source_project_id,target_project_id,relationship,created_at,source:projects!project_relationships_source_project_id_fkey(id,name,slug,type),target:projects!project_relationships_target_project_id_fkey(id,name,slug,type)&or=(source_project_id.eq." +
      encodeURIComponent(projectId) + ",target_project_id.eq." + encodeURIComponent(projectId) + ")&order=created_at.desc",
    { headers: supabaseHeaders, cache: "no-store" },
  );
  if (!response.ok) return NextResponse.json({ error: "Project relationships could not be loaded." }, { status: 502 });

  const rows = await response.json().catch(() => null);
  return NextResponse.json({ relationships: Array.isArray(rows) ? rows : [] });
}

export async function POST(request: Request) {
  const token = (await cookies()).get("eidolon_access_token")?.value;
  if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await request.json().catch(() => null) as { sourceProjectId?: string; targetProjectId?: string; relationship?: string } | null;
  const sourceProjectId = body?.sourceProjectId?.trim();
  const targetProjectId = body?.targetProjectId?.trim();
  const relationship = body?.relationship?.trim() as ProjectRelationship | undefined;

  if (!sourceProjectId || !targetProjectId || sourceProjectId === targetProjectId) return NextResponse.json({ error: "Two different project ids are required." }, { status: 400 });
  if (!relationship || !relationshipPattern.test(relationship)) return NextResponse.json({ error: "Invalid project relationship." }, { status: 400 });

  const userResponse = await fetch(supabaseUrl + "/auth/v1/user", { headers: { ...supabaseHeaders, Authorization: "Bearer " + token }, cache: "no-store" });
  if (!userResponse.ok) return NextResponse.json({ error: "Authentication session is no longer valid." }, { status: 401 });
  const user = await userResponse.json().catch(() => null) as { id?: string } | null;
  if (!user?.id) return NextResponse.json({ error: "Authentication session is no longer valid." }, { status: 401 });

  const response = await fetch(supabaseUrl + "/rest/v1/project_relationships", {
    method: "POST",
    headers: { ...supabaseHeaders, Authorization: "Bearer " + token, "content-type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ source_project_id: sourceProjectId, target_project_id: targetProjectId, relationship, created_by: user.id }),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Relationship could not be recorded." }, { status: response.status === 401 || response.status === 403 ? 403 : 502 });
  return NextResponse.json({ relationship: (await response.json().catch(() => null))?.[0] ?? null });
}