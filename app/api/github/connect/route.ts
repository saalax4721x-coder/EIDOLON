import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { createGithubPkce } from "@/lib/github";

export async function GET(request: Request) {
  const accessToken = (await cookies()).get("eidolon_access_token")?.value;
  if (!accessToken) return NextResponse.redirect(new URL("/auth", request.url));

  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_REDIRECT_URI;
  if (!clientId || !redirectUri) return NextResponse.json({ error: "GitHub verification is not configured yet." }, { status: 503 });

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId")?.trim() ?? "";
  const next = url.searchParams.get("next")?.trim() ?? "/";
  if (!projectId) return NextResponse.json({ error: "Missing project id." }, { status: 400 });
  if (!next.startsWith("/")) return NextResponse.json({ error: "Invalid return path." }, { status: 400 });

  const state = randomBytes(32).toString("base64url");
  const { verifier, challenge } = createGithubPkce();
  const response = NextResponse.redirect("https://github.com/login/oauth/authorize?" + new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    scope: "repo",
  }).toString());

  response.cookies.set("eidolon_github_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  response.cookies.set("eidolon_github_verifier", verifier, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  response.cookies.set("eidolon_github_project", projectId, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  response.cookies.set("eidolon_github_next", next, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return response;
}
