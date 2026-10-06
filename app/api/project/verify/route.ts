import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";

export async function POST(request: Request) {
  const accessToken = (await cookies()).get("eidolon_access_token")?.value;
  if (!accessToken) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { projectId?: string } | null;
  const projectId = body?.projectId?.trim();
  if (!projectId) return NextResponse.json({ error: "Missing project id." }, { status: 400 });

  const authHeaders = { ...supabaseHeaders, Authorization: "Bearer " + accessToken };
  const response = await fetch(
    `${supabaseUrl}/rest/v1/projects?select=id,owner_id&owner_id=is.not.null&id=eq.${encodeURIComponent(projectId)}&limit=1`,
    { headers: authHeaders, cache: "no-store" }
  );
  if (!response.ok) return NextResponse.json({ error: "Project could not be checked." }, { status: 502 });
  const rows = await response.json() as Array<{id:string;owner_id:string}>;
  if (!rows[0]) return NextResponse.json({ error: "Project not found or not owned by this account." }, { status: 404 });

  return NextResponse.json({
    status: "pending",
    message: "Source verification is not yet provider-backed. EIDOLON will not mark ownership verified without proof from the underlying source."
  });
}
