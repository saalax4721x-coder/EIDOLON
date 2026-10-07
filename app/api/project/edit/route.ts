import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const token = (await cookies()).get("eidolon_access_token")?.value;
  if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await request.json().catch(() => null) as { projectId?: string; name?: string; description?: string } | null;
  const projectId = body?.projectId?.trim();
  const name = body?.name?.trim();
  const description = body?.description?.trim();

  if (!projectId) return NextResponse.json({ error: "Missing project id." }, { status: 400 });
  if (!name || name.length < 2 || name.length > 120) return NextResponse.json({ error: "Project name must be 2–120 characters." }, { status: 400 });
  if (description === undefined || description.length > 4000) return NextResponse.json({ error: "Description must be 0–4000 characters." }, { status: 400 });

  const headers = { ...supabaseHeaders, Authorization: "Bearer " + token, "content-type": "application/json" };
  const response = await fetch(
    supabaseUrl + "/rest/v1/projects?id=eq." + encodeURIComponent(projectId),
    { method: "PATCH", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ name, description }), cache: "no-store" },
  );

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({ error: "Project could not be updated.", detail }, { status: response.status === 401 || response.status === 403 ? 403 : 502 });
  }

  const rows = await response.json().catch(() => null) as Array<{ id: string; name: string; description: string | null }> | null;
  if (!rows?.[0]) return NextResponse.json({ error: "Project not found or not owned by this account." }, { status: 404 });
  return NextResponse.json({ project: rows[0] });
}
