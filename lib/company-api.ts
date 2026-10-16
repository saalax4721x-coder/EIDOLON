import { cookies } from "next/headers";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";
import { uuid } from "@/lib/workflow";
export type CompanyAuth = { id: string; headers: Record<string, string> };
export async function companySession(): Promise<CompanyAuth | null> {
  const token = (await cookies()).get("eidolon_access_token")?.value;
  if (!token) return null;
  const headers = { ...supabaseHeaders, Authorization: `Bearer ${token}` };
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, { headers, cache: "no-store" });
  if (!response.ok) return null;
  const user = await response.json();
  return typeof user.id === "string" ? { id: user.id, headers } : null;
}
export async function companyOwned(companyId: unknown, auth: CompanyAuth): Promise<boolean> {
  if (typeof companyId !== "string" || !uuid.test(companyId)) return false;
  const response = await fetch(`${supabaseUrl}/rest/v1/companies?select=id&id=eq.${companyId}&owner_id=eq.${auth.id}&limit=1`, { headers: auth.headers, cache: "no-store" });
  if (!response.ok) throw Error("Company access unavailable");
  return (await response.json()).length === 1;
}
export async function companyData<T>(auth: CompanyAuth, path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, { method, headers: { ...auth.headers, Prefer: "return=representation" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: "no-store", signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw Error("Company records could not be saved or loaded. Check database migrations and retry.");
  return response.json() as Promise<T>;
}
