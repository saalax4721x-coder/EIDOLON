import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";

export const dynamic = "force-dynamic";

async function currentUser() {
  const token = (await cookies()).get("eidolon_access_token")?.value;
  if (!token) return null;
  const headers = { ...supabaseHeaders, Authorization: `Bearer ${token}` };
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, { headers, cache: "no-store" });
  if (!response.ok) return null;
  const user = await response.json() as { id?: string };
  return user.id ? { id: user.id, headers } : null;
}

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in to view company work." }, { status: 401 });
    const companyId = new URL(request.url).searchParams.get("companyId") ?? "";
    if (!companyId) return NextResponse.json({ error: "Choose a company." }, { status: 400 });

    const companyResponse = await fetch(
      `${supabaseUrl}/rest/v1/companies?select=id&owner_id=eq.${encodeURIComponent(user.id)}&id=eq.${encodeURIComponent(companyId)}&limit=1`,
      { headers: user.headers, cache: "no-store" },
    );
    if (!companyResponse.ok) return NextResponse.json({ error: "Company access could not be verified." }, { status: 502 });
    const owned = await companyResponse.json() as Array<{ id: string }>;
    if (!owned.length) return NextResponse.json({ error: "Company not found or access denied." }, { status: 404 });

    const [taskResponse, artifactResponse] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/company_tasks?select=id,title,objective,task_type,status,result,error_code,assigned_agent_id,created_at,updated_at,completed_at&company_id=eq.${encodeURIComponent(companyId)}&order=created_at.desc&limit=50`, { headers: user.headers, cache: "no-store" }),
      fetch(`${supabaseUrl}/rest/v1/company_artifacts?select=id,title,body,artifact_type,source_provider,created_at,task_id&company_id=eq.${encodeURIComponent(companyId)}&order=created_at.desc&limit=50`, { headers: user.headers, cache: "no-store" }),
    ]);
    if (!taskResponse.ok || !artifactResponse.ok) return NextResponse.json({ error: "Company work history could not be loaded." }, { status: 502 });
    const [tasks, artifacts] = await Promise.all([taskResponse.json(), artifactResponse.json()]);
    return NextResponse.json({ tasks, artifacts });
  } catch {
    return NextResponse.json({ error: "Company work service is temporarily unavailable." }, { status: 503 });
  }
}
