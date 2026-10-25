import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";

export const dynamic = "force-dynamic";

async function session() {
  const token = (await cookies()).get("eidolon_access_token")?.value;
  if (!token) return null;
  const headers = { ...supabaseHeaders, Authorization: `Bearer ${token}` };
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, { headers, cache: "no-store" });
  if (!response.ok) return null;
  const user = await response.json() as { id?: string };
  return user.id ? { id: user.id, token, headers } : null;
}

export async function GET() {
  try {
    const auth = await session();
    if (!auth) return NextResponse.json({ error: "Sign in to view your companies." }, { status: 401 });
    const response = await fetch(
      `${supabaseUrl}/rest/v1/companies?select=id,name,slug,industry,mission,business_model,target_customer,launch_plan,status,created_at,updated_at&owner_id=eq.${encodeURIComponent(auth.id)}&order=created_at.desc`,
      { headers: auth.headers, cache: "no-store" },
    );
    if (!response.ok) return NextResponse.json({ error: "Company records could not be loaded." }, { status: 502 });
    const companies = await response.json();
    return NextResponse.json({ companies });
  } catch {
    return NextResponse.json({ error: "Company service is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await session();
    if (!auth) return NextResponse.json({ error: "Sign in before launching a company." }, { status: 401 });
    let input: Record<string, unknown>;
    try { input = await request.json(); } catch { return NextResponse.json({ error: "Invalid company payload." }, { status: 400 }); }

    const name = typeof input.name === "string" ? input.name.trim() : "";
    const mission = typeof input.mission === "string" ? input.mission.trim() : "";
    const industry = typeof input.industry === "string" ? input.industry.trim().slice(0, 100) : "Other";
    const businessModel = typeof input.businessModel === "string" ? input.businessModel.trim().slice(0, 240) : "To be defined";
    const targetCustomer = typeof input.targetCustomer === "string" ? input.targetCustomer.trim().slice(0, 1000) : "";
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
    if (name.length < 2 || name.length > 120) return NextResponse.json({ error: "Company name must be 2–120 characters." }, { status: 400 });
    if (mission.length < 10 || mission.length > 4000) return NextResponse.json({ error: "Describe the company's mission in 10–4000 characters." }, { status: 400 });
    if (!slug) return NextResponse.json({ error: "Company name must contain letters or numbers." }, { status: 400 });

    const plan = input.launchPlan && typeof input.launchPlan === "object" && !Array.isArray(input.launchPlan) ? input.launchPlan : {};
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/create_company_bundle`, {
      method: "POST",
      headers: auth.headers,
      body: JSON.stringify({ p_name: name, p_slug: slug, p_industry: industry || "Other", p_mission: mission, p_business_model: businessModel || "To be defined", p_target_customer: targetCustomer, p_launch_plan: plan }),
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = await response.text();
      if (detail.includes("23505") || detail.toLowerCase().includes("duplicate")) return NextResponse.json({ error: "A company with that name already exists. Choose another name." }, { status: 409 });
      if (detail.includes("42501")) return NextResponse.json({ error: "Your session expired. Sign in again." }, { status: 401 });
      return NextResponse.json({ error: "Company could not be created. No company was partially saved." }, { status: 502 });
    }
    const id = await response.json() as unknown;
    if (typeof id !== "string") return NextResponse.json({ error: "Company creation returned an invalid identity." }, { status: 502 });
    return NextResponse.json({ company: { id, name, slug, industry, mission, businessModel, targetCustomer, launchPlan: plan, status: "planning" } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Company service is temporarily unavailable. Nothing was simulated." }, { status: 503 });
  }
}
