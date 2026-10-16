import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";

export const dynamic = "force-dynamic";
async function currentUser() {
  const accessToken = (await cookies()).get("eidolon_access_token")?.value;
  if (!accessToken) return null;
  const headers = { ...supabaseHeaders, Authorization: `Bearer ${accessToken}` };
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, { headers, cache: "no-store" });
  if (!response.ok) return null;
  const user = await response.json() as { id?: string };
  return user.id ? { id: user.id, headers } : null;
}
async function ownsCompany(companyId: string, userId: string, headers: Record<string,string>) {
  const response = await fetch(`${supabaseUrl}/rest/v1/companies?select=id&owner_id=eq.${encodeURIComponent(userId)}&id=eq.${encodeURIComponent(companyId)}&limit=1`, { headers, cache: "no-store" });
  if (!response.ok) return false;
  return ((await response.json()) as Array<{id:string}>).length === 1;
}
export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in to manage MCP connections." }, { status: 401 });
    const companyId = new URL(request.url).searchParams.get("companyId") ?? "";
    if (!companyId || !(await ownsCompany(companyId,user.id,user.headers))) return NextResponse.json({ error: "Company not found or access denied." }, { status: 404 });
    const response = await fetch(`${supabaseUrl}/rest/v1/company_mcp_tokens?select=id,label,scopes,revoked_at,created_at,last_used_at&company_id=eq.${encodeURIComponent(companyId)}&order=created_at.desc`, { headers:user.headers,cache:"no-store" });
    if (!response.ok) return NextResponse.json({ error: "MCP connections could not be loaded. Apply the company MCP migration first." }, { status: 502 });
    return NextResponse.json({ tokens: await response.json() });
  } catch { return NextResponse.json({ error: "MCP connection service is temporarily unavailable." }, { status: 503 }); }
}
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in to connect ChatGPT or Claude." }, { status: 401 });
    let input: Record<string,unknown>;
    try { input = await request.json(); } catch { return NextResponse.json({ error: "Invalid MCP connection request." }, { status: 400 }); }
    const companyId = typeof input.companyId === "string" ? input.companyId : "";
    const label = typeof input.label === "string" ? input.label.trim().slice(0,100) : "External AI assistant";
    if (!companyId || !(await ownsCompany(companyId,user.id,user.headers))) return NextResponse.json({ error: "Company not found or access denied." }, { status: 404 });
    const token = "eid_mcp_" + randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const response = await fetch(`${supabaseUrl}/rest/v1/company_mcp_tokens`, {
      method:"POST",
      headers:{...user.headers,Prefer:"return=representation"},
      body:JSON.stringify({company_id:companyId,created_by:user.id,label:label||"External AI assistant",token_hash:tokenHash,scopes:["company:read","tasks:create","artifacts:write"]}),
      cache:"no-store",
    });
    if (!response.ok) return NextResponse.json({ error: "MCP access could not be created. Confirm the company MCP migration is applied." }, { status: 502 });
    const rows = await response.json() as Array<{id:string;label:string;scopes:string[];created_at:string}>;
    if (!rows[0]) return NextResponse.json({ error: "MCP access was saved without a readable record." }, { status: 502 });
    return NextResponse.json({ token, connection: rows[0], warning: "Copy this token now. It cannot be retrieved again." }, { status: 201 });
  } catch { return NextResponse.json({ error: "MCP connection service is temporarily unavailable." }, { status: 503 }); }
}
export async function DELETE(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in to revoke MCP access." }, { status: 401 });
    const input = await request.json() as Record<string,unknown>;
    const companyId = typeof input.companyId === "string" ? input.companyId : "";
    const tokenId = typeof input.tokenId === "string" ? input.tokenId : "";
    if (!companyId || !tokenId || !(await ownsCompany(companyId,user.id,user.headers))) return NextResponse.json({ error: "Company or token not found." }, { status: 404 });
    const response = await fetch(`${supabaseUrl}/rest/v1/company_mcp_tokens?id=eq.${encodeURIComponent(tokenId)}&company_id=eq.${encodeURIComponent(companyId)}&revoked_at=is.null`, {
      method:"PATCH",headers:{...user.headers,Prefer:"return=minimal"},body:JSON.stringify({revoked_at:new Date().toISOString()}),cache:"no-store"
    });
    if (!response.ok) return NextResponse.json({ error: "MCP access could not be revoked." }, { status: 502 });
    return NextResponse.json({ revoked: true });
  } catch { return NextResponse.json({ error: "MCP connection service is temporarily unavailable." }, { status: 503 }); }
}
