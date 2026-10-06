import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = (await cookies()).get("eidolon_access_token")?.value;
  if (!token) return NextResponse.json({ projects: [], authenticated: false }, { status: 401 });

  const response = await fetch(
    supabaseUrl + "/rest/v1/projects?select=id,name,slug,type,description,economy,verification_status,created_at,updated_at&order=created_at.desc",
    { headers: { ...supabaseHeaders, Authorization: "Bearer " + token }, cache: "no-store" },
  );
  if (!response.ok) return NextResponse.json({ error: "Account projects could not be loaded." }, { status: 502 });
  const projects = await response.json().catch(() => null);
  if (!Array.isArray(projects)) return NextResponse.json({ error: "Account projects response was invalid." }, { status: 502 });
  return NextResponse.json({ projects, authenticated: true });
}