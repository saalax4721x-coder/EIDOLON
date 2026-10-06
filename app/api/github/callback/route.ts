import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decryptSecret, encryptSecret, githubApi } from "@/lib/github";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";
import { verifyGithubProject } from "@/lib/github-verification";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const state = cookieStore.get("eidolon_github_state")?.value;
  const verifier = cookieStore.get("eidolon_github_verifier")?.value;
  const projectId = cookieStore.get("eidolon_github_project")?.value;
  const next = cookieStore.get("eidolon_github_next")?.value || "/";
  const url = new URL(request.url);

  if (!state || state !== url.searchParams.get("state") || !verifier) return NextResponse.redirect(new URL("/project?error=github_state", request.url));
  if (url.searchParams.get("error")) return NextResponse.redirect(new URL(next, request.url));

  const eidolonToken = cookieStore.get("eidolon_access_token")?.value;
  if (!eidolonToken) return NextResponse.redirect(new URL("/auth", request.url));

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri = process.env.GITHUB_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return NextResponse.redirect(new URL(next + (next.includes("?") ? "&" : "?") + "error=github_not_configured", request.url));

  const exchange = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code: url.searchParams.get("code"), redirect_uri: redirectUri, code_verifier: verifier }),
  });
  if (!exchange.ok) return NextResponse.redirect(new URL(next + (next.includes("?") ? "&" : "?") + "error=github_exchange", request.url));
  const token = await exchange.json() as { access_token?: string; refresh_token?: string; expires_in?: number; refresh_token_expires_in?: number; scope?: string };
  if (!token.access_token) return NextResponse.redirect(new URL(next + (next.includes("?") ? "&" : "?") + "error=github_token", request.url));

  const identity = await githubApi("/user", token.access_token);
  if (!identity.ok) return NextResponse.redirect(new URL(next + (next.includes("?") ? "&" : "?") + "error=github_identity", request.url));
  const githubUser = await identity.json() as { id:number; login:string };

  const eidolonUser = await fetch(supabaseUrl + "/auth/v1/user", { headers: { ...supabaseHeaders, Authorization: "Bearer " + eidolonToken }, cache: "no-store" });
  if (!eidolonUser.ok) return NextResponse.redirect(new URL("/auth", request.url));
  const user = await eidolonUser.json() as { id?: string };
  if (!user.id) return NextResponse.redirect(new URL("/auth", request.url));

  const connection = await fetch(supabaseUrl + "/rest/v1/provider_connections", {
    method: "POST",
    headers: { ...supabaseHeaders, Authorization: "Bearer " + eidolonToken, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: user.id,
      provider: "github",
      provider_user_id: String(githubUser.id),
      provider_login: githubUser.login,
      access_token_ciphertext: encryptSecret(token.access_token),
      refresh_token_ciphertext: token.refresh_token ? encryptSecret(token.refresh_token) : null,
      expires_at: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null,
      refresh_expires_at: token.refresh_token_expires_in ? new Date(Date.now() + token.refresh_token_expires_in * 1000).toISOString() : null,
      scopes: (token.scope ?? "").split(",").map((s:string)=>s.trim()).filter(Boolean),
    }),
  });
  if (!connection.ok) return NextResponse.redirect(new URL(next + (next.includes("?") ? "&" : "?") + "error=github_connection", request.url));

  let target = next;
  if (projectId) {
    try {
      const result = await verifyGithubProject(projectId, eidolonToken, token.access_token);
      target = next + (next.includes("?") ? "&" : "?") + "github=" + encodeURIComponent(result.verified ? "verified" : result.code);
    } catch {
      target = next + (next.includes("?") ? "&" : "?") + "github=verification_failed";
    }
  }

  const response = NextResponse.redirect(new URL(target, request.url));
  for (const name of ["eidolon_github_state","eidolon_github_verifier","eidolon_github_project","eidolon_github_next"]) response.cookies.delete(name);
  return response;
}
