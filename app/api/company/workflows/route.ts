import { NextResponse } from "next/server";
import { companySession, companyOwned, companyData } from "@/lib/company-api";
import { uuid, validateGraph, type Workflow } from "@/lib/workflow";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const user = await companySession();
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    const companyId = new URL(request.url).searchParams.get("companyId");
    if (!await companyOwned(companyId, user)) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    const workflows = await companyData(user, `company_workflows?select=id,name,description,nodes,edges,status,updated_at&company_id=eq.${companyId}&order=updated_at.desc&limit=100`);
    return NextResponse.json({ workflows });
  } catch { return NextResponse.json({ error: "Workflows unavailable. Check database migrations and retry." }, { status: 503 }); }
}
async function write(request: Request, method: "POST" | "PATCH" | "DELETE") {
  try {
    const user = await companySession();
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid workflow payload" }, { status: 400 });
    if (!await companyOwned(body.companyId, user)) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    if (method !== "POST" && (typeof body.id !== "string" || !uuid.test(body.id))) return NextResponse.json({ error: "Invalid workflow identity" }, { status: 400 });
    const path = method === "POST" ? "company_workflows" : `company_workflows?id=eq.${body.id}&company_id=eq.${body.companyId}`;
    if (method === "DELETE") {
      const rows = await companyData<Workflow[]>(user, path, method);
      return NextResponse.json(rows.length ? { deleted: true } : { error: "Workflow not found" }, { status: rows.length ? 200 : 404 });
    }
    const errors = validateGraph(body.nodes, body.edges);
    if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.length > 120 || typeof (body.description ?? "") !== "string" || (body.description ?? "").length > 1000 || !["draft", "active", "archived"].includes(body.status ?? "draft")) errors.push("Check workflow name, description and status.");
    if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
    const agents = await companyData<{ id: string }[]>(user, `company_ai_agents?select=id&company_id=eq.${body.companyId}`);
    if (body.nodes.some((n: { agentId?: string }) => n.agentId && !agents.some(a => a.id === n.agentId))) return NextResponse.json({ error: "Assigned agent is not in this company" }, { status: 400 });
    const rows = await companyData<Workflow[]>(user, path, method, {
      ...(method === "POST" ? { company_id: body.companyId, created_by: user.id } : {}),
      name: body.name.trim(), description: body.description ?? "", nodes: body.nodes, edges: body.edges, status: body.status ?? "draft", updated_at: new Date().toISOString(),
    });
    if (!rows[0]) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    return NextResponse.json({ workflow: rows[0] }, { status: method === "POST" ? 201 : 200 });
  } catch { return NextResponse.json({ error: method === "DELETE" ? "Unable to delete workflow. Workflows with run history must be archived instead." : "Unable to save workflow. Retry after checking database migrations." }, { status: 503 }); }
}
export const POST = (request: Request) => write(request, "POST");
export const PATCH = (request: Request) => write(request, "PATCH");
export const DELETE = (request: Request) => write(request, "DELETE");
