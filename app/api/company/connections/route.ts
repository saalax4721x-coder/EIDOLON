import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encryptAiCredential } from "@/lib/ai-credentials";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";

export const dynamic = "force-dynamic";
type Provider = "openai" | "anthropic" | "openrouter";

async function auth() {
  const token = (await cookies()).get("eidolon_access_token")?.value;
  if (!token) return null;
  const headers = { ...supabaseHeaders, Authorization: `Bearer ${token}` };
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, { headers, cache: "no-store" });
  if (!response.ok) return null;
  const user = await response.json() as { id?: string };
  return user.id ? { id: user.id, headers } : null;
}
async function ownsCompany(companyId: string, userId: string, headers: Record<string, string>) {
  const response = await fetch(`${supabaseUrl}/rest/v1/companies?select=id&owner_id=eq.${encodeURIComponent(userId)}&id=eq.${encodeURIComponent(companyId)}&limit=1`, { headers, cache: "no-store" });
  if (!response.ok) return false;
  const rows = await response.json() as Array<{ id: string }>;
  return rows.length === 1;
}
function providerUrl(provider: Provider) {
  if (provider === "openai") return "https://api.openai.com/v1/models";
  if (provider === "anthropic") return "https://api.anthropic.com/v1/models?limit=1";
  return "https://openrouter.ai/api/v1/models";
}
async function validateCredential(provider: Provider, key: string) {
  const headers: Record<string, string> = provider === "anthropic"
    ? { "x-api-key": key, "anthropic-version": "2023-06-01" }
    : { Authorization: `Bearer ${key}` };
  const response = await fetch(providerUrl(provider), { headers, cache: "no-store", signal: AbortSignal.timeout(12000) });
  return response.ok;
}

export async function GET(request: Request) {
  try {
    const current = await auth();
    if (!current) return NextResponse.json({ error: "Sign in to manage AI connections." }, { status: 401 });
    const companyId = new URL(request.url).searchParams.get("companyId") ?? "";
    if (!companyId || !(await ownsCompany(companyId, current.id, current.headers))) return NextResponse.json({ error: "Company not found or access denied." }, { status: 404 });
    const response = await fetch(`${supabaseUrl}/rest/v1/company_ai_connections?select=id,provider,auth_method,display_name,scopes,status,last_checked_at,created_at,updated_at&company_id=eq.${encodeURIComponent(companyId)}&order=created_at.desc`, { headers: current.headers, cache: "no-store" });
    if (!response.ok) return NextResponse.json({ error: "AI connections could not be loaded." }, { status: 502 });
    return NextResponse.json({ connections: await response.json() });
  } catch {
    return NextResponse.json({ error: "AI connection service is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const current = await auth();
    if (!current) return NextResponse.json({ error: "Sign in to connect an AI provider." }, { status: 401 });
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid connection payload." }, { status: 400 }); }
    const companyId = typeof body.companyId === "string" ? body.companyId : "";
    const provider = body.provider as Provider;
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    if (!companyId || !(await ownsCompany(companyId, current.id, current.headers))) return NextResponse.json({ error: "Company not found or access denied." }, { status: 404 });
    if (!["openai", "anthropic", "openrouter"].includes(provider)) return NextResponse.json({ error: "This provider is not yet supported for direct API-key connections." }, { status: 400 });
    if (apiKey.length < 12 || apiKey.length > 4096) return NextResponse.json({ error: "Enter a valid provider API key." }, { status: 400 });

    let valid = false;
    try { valid = await validateCredential(provider, apiKey); } catch { return NextResponse.json({ error: "The provider could not be reached. Check the network and try again." }, { status: 503 }); }
    if (!valid) return NextResponse.json({ error: "The provider rejected this credential. Check the key and its permissions." }, { status: 400 });

    let ciphertext: string;
    try { ciphertext = encryptAiCredential(apiKey); } catch (error) {
      const code = error instanceof Error ? error.message : "";
      return NextResponse.json({ error: code === "ai_encryption_not_configured" || code === "ai_encryption_key_invalid" ? "AI credential storage is not configured on this deployment. Ask the administrator to set EIDOLON_AI_ENCRYPTION_KEY." : "Credential encryption failed. Nothing was stored." }, { status: 503 });
    }
    const displayName = provider === "openai" ? "OpenAI API" : provider === "anthropic" ? "Anthropic API" : "OpenRouter API";
    const response = await fetch(`${supabaseUrl}/rest/v1/company_ai_connections?on_conflict=company_id,provider,auth_method,display_name`, {
      method: "POST",
      headers: { ...current.headers, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ company_id: companyId, created_by: current.id, provider, auth_method: "api_key", display_name: displayName, credential_ciphertext: ciphertext, status: "connected", last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ error: "The credential passed validation but could not be saved." }, { status: 502 });
    const rows = await response.json() as Array<{ id: string; provider: string; display_name: string; status: string }>;
    if (!rows[0]) return NextResponse.json({ error: "The provider connection was saved without a readable status." }, { status: 502 });
    return NextResponse.json({ connection: rows[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "AI connection service is temporarily unavailable." }, { status: 503 });
  }
}
