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
async function owns(companyId: string, userId: string, headers: Record<string,string>) {
  const response = await fetch(`${supabaseUrl}/rest/v1/companies?select=id&owner_id=eq.${encodeURIComponent(userId)}&id=eq.${encodeURIComponent(companyId)}&limit=1`, { headers, cache: "no-store" });
  if (!response.ok) return false;
  return ((await response.json()) as Array<{id:string}>).length === 1;
}
export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in to view the AI workforce." }, { status: 401 });
    const companyId = new URL(request.url).searchParams.get("companyId") ?? "";
    if (!companyId || !(await owns(companyId,user.id,user.headers))) return NextResponse.json({ error: "Company not found or access denied." }, { status: 404 });
    const response = await fetch(`${supabaseUrl}/rest/v1/company_ai_agents?select=id,name,role,description,runtime,provider,model,connection_id,instructions,allowed_tools,status,created_at,updated_at&company_id=eq.${encodeURIComponent(companyId)}&order=created_at.asc`, { headers:user.headers,cache:"no-store" });
    if (!response.ok) return NextResponse.json({ error:"AI workforce could not be loaded."},{status:502});
    return NextResponse.json({ agents:await response.json() });
  } catch { return NextResponse.json({error:"AI workforce service is temporarily unavailable."},{status:503}); }
}
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in to add an AI employee." }, { status: 401 });
    let body: Record<string,unknown>;
    try { body = await request.json(); } catch { return NextResponse.json({error:"Invalid AI employee payload."},{status:400}); }
    const companyId = typeof body.companyId === "string" ? body.companyId : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const role = typeof body.role === "string" ? body.role.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const instructions = typeof body.instructions === "string" ? body.instructions.trim() : "";
    const runtime = body.runtime === "provider" || body.runtime === "external" ? body.runtime : "eidolon";
    const provider = typeof body.provider === "string" ? body.provider : null;
    const model = typeof body.model === "string" ? body.model.trim() : "";
    const connectionId = typeof body.connectionId === "string" ? body.connectionId : null;
    if (!companyId || !(await owns(companyId,user.id,user.headers))) return NextResponse.json({error:"Company not found or access denied."},{status:404});
    if (name.length < 2 || name.length > 100 || role.length < 2 || role.length > 120) return NextResponse.json({error:"Employee name and role are required."},{status:400});
    if (runtime === "provider" && (!["openai","anthropic","openrouter"].includes(provider ?? "") || !model || !connectionId)) return NextResponse.json({error:"Choose a connected provider, model ID and connection."},{status:400});
    if (runtime === "external") return NextResponse.json({error:"External ChatGPT/Claude agent linking requires a supported OAuth or MCP endpoint; browser-account scraping is not supported. Use a connected API provider for execution for now."},{status:400});
    if (runtime === "provider") {
      const conn = await fetch(`${supabaseUrl}/rest/v1/company_ai_connections?select=id,provider,status&company_id=eq.${encodeURIComponent(companyId)}&id=eq.${encodeURIComponent(connectionId!)}&limit=1`,{headers:user.headers,cache:"no-store"});
      const rows = conn.ok ? await conn.json() as Array<{id:string;provider:string;status:string}> : [];
      if (!rows[0] || rows[0].provider !== provider || rows[0].status !== "connected") return NextResponse.json({error:"The selected provider connection is not active for this company."},{status:400});
    }
    const response = await fetch(`${supabaseUrl}/rest/v1/company_ai_agents`, {
      method:"POST",headers:{...user.headers,Prefer:"return=representation"},
      body:JSON.stringify({company_id:companyId,created_by:user.id,name,role,description,runtime,provider:runtime==="provider"?provider:null,model:runtime==="provider"?model:null,connection_id:runtime==="provider"?connectionId:null,instructions,allowed_tools:[],status:"draft"}),
      cache:"no-store"
    });
    if (!response.ok) return NextResponse.json({error:"AI employee could not be saved."},{status:502});
    const rows = await response.json() as Array<Record<string,unknown>>;
    return NextResponse.json({agent:rows[0]},{status:201});
  } catch { return NextResponse.json({error:"AI workforce service is temporarily unavailable."},{status:503}); }
}


export async function PATCH(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in to manage AI employees." }, { status: 401 });
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid employee update." }, { status: 400 }); }
    const companyId = typeof body.companyId === "string" ? body.companyId : "";
    const agentId = typeof body.agentId === "string" ? body.agentId : "";
    const status = body.status === "active" || body.status === "paused" || body.status === "draft" ? body.status : "";
    if (!companyId || !agentId || !status) return NextResponse.json({ error: "Choose an employee and a valid status." }, { status: 400 });
    if (!(await owns(companyId, user.id, user.headers))) return NextResponse.json({ error: "Company not found or access denied." }, { status: 404 });
    const lookup = await fetch(`${supabaseUrl}/rest/v1/company_ai_agents?select=id,runtime,provider,model,connection_id&company_id=eq.${encodeURIComponent(companyId)}&id=eq.${encodeURIComponent(agentId)}&limit=1`, { headers: user.headers, cache: "no-store" });
    if (!lookup.ok) return NextResponse.json({ error: "Employee could not be loaded." }, { status: 502 });
    const agents = await lookup.json() as Array<{id:string;runtime:string;provider:string|null;model:string|null;connection_id:string|null}>;
    const agent = agents[0];
    if (!agent) return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    if (status === "active") {
      if (agent.runtime !== "provider" || !agent.provider || !agent.model || !agent.connection_id) return NextResponse.json({ error: "Connect a provider and assign a model before activating this employee." }, { status: 400 });
      const connection = await fetch(`${supabaseUrl}/rest/v1/company_ai_connections?select=id,status,provider&company_id=eq.${encodeURIComponent(companyId)}&id=eq.${encodeURIComponent(agent.connection_id)}&limit=1`, { headers: user.headers, cache: "no-store" });
      const rows = connection.ok ? await connection.json() as Array<{id:string;status:string;provider:string}> : [];
      if (!rows[0] || rows[0].status !== "connected" || rows[0].provider !== agent.provider) return NextResponse.json({ error: "Reconnect this employee's provider before activation." }, { status: 400 });
    }
    const response = await fetch(`${supabaseUrl}/rest/v1/company_ai_agents?id=eq.${encodeURIComponent(agentId)}&company_id=eq.${encodeURIComponent(companyId)}`, {
      method: "PATCH", headers: { ...user.headers, Prefer: "return=representation" },
      body: JSON.stringify({ status, updated_at: new Date().toISOString() }), cache: "no-store"
    });
    if (!response.ok) return NextResponse.json({ error: "Employee status could not be updated." }, { status: 502 });
    const rows = await response.json() as Array<Record<string, unknown>>;
    if (!rows[0]) return NextResponse.json({ error: "Employee status update was not confirmed." }, { status: 502 });
    return NextResponse.json({ agent: rows[0] });
  } catch { return NextResponse.json({ error: "AI workforce service is temporarily unavailable." }, { status: 503 }); }
}
