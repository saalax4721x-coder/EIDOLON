import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request) {
  const token = (await cookies()).get("eidolon_access_token")?.value;
  if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await request.json().catch(() => null) as { projectId?: string; mode?: string } | null;
  const projectId = body?.projectId?.trim() ?? "";
  const mode = body?.mode?.trim() ?? "";
  if (!uuidPattern.test(projectId)) return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  if (mode !== "none" && mode !== "token") return NextResponse.json({ error: "Invalid economy mode." }, { status: 400 });

  const response = await fetch(supabaseUrl + "/rest/v1/rpc/update_project_economy", {
    method: "POST",
    headers: { ...supabaseHeaders, Authorization: "Bearer " + token, "content-type": "application/json" },
    body: JSON.stringify({ p_project_id: projectId, p_mode: mode }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403 || response.status === 425) {
      return NextResponse.json({ error: "You do not have permission to change this project's economy." }, { status: 403 });
    }
    if (response.status === 422 || response.status === 400) {
      return NextResponse.json({ error: "Invalid economy configuration." }, { status: 400 });
    }
    return NextResponse.json({ error: "Economy could not be updated." }, { status: 502 });
  }
  return NextResponse.json({ economy: data });
}