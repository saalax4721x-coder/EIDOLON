import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";

export const dynamic = "force-dynamic";

async function authHeaders() {
  const token = (await cookies()).get("eidolon_access_token")?.value;
  return token ? { ...supabaseHeaders, Authorization: `Bearer ${token}` } : null;
}

async function projectExists(projectId: string, headers: Record<string,string>) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/projects?select=id&id=eq.${encodeURIComponent(projectId)}&limit=1`,
    { headers, cache: "no-store" }
  );
  if (!response.ok) return null;
  const rows = await response.json() as Array<{ id: string }>;
  return rows[0]?.id ?? null;
}

export async function POST(request: NextRequest) {
  const headers = await authHeaders();
  if (!headers) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await request.json().catch(() => null) as { projectId?: string } | null;
  const projectId = body?.projectId?.trim();
  if (!projectId) return NextResponse.json({ error: "Missing project id." }, { status: 400 });

  const exists = await projectExists(projectId, headers);
  if (!exists) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers, cache: "no-store" });
  if (!userResponse.ok) return NextResponse.json({ error: "Authentication session is invalid." }, { status: 401 });
  const user = await userResponse.json() as { id?: string };
  if (!user.id) return NextResponse.json({ error: "Authentication session is invalid." }, { status: 401 });

  const response = await fetch(`${supabaseUrl}/rest/v1/project_follows`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ project_id: projectId, user_id: user.id })
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({ error: "Project could not be followed.", detail }, { status: response.status === 401 ? 401 : 502 });
  }
  return NextResponse.json({ following: true });
}

export async function DELETE(request: NextRequest) {
  const headers = await authHeaders();
  if (!headers) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) return NextResponse.json({ error: "Missing project id." }, { status: 400 });

  const response = await fetch(
    `${supabaseUrl}/rest/v1/project_follows?project_id=eq.${encodeURIComponent(projectId)}`,
    { method: "DELETE", headers }
  );

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({ error: "Project could not be unfollowed.", detail }, { status: response.status === 401 ? 401 : 502 });
  }
  return NextResponse.json({ following: false });
}
