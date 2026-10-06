import { NextResponse } from "next/server";
import { supabaseUrl, supabasePublishableKey } from "@/lib/supabase-config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const verifier = request.headers.get("cookie")?.match(/(?:^|;\\s*)eidolon_pkce_verifier=([^;]+)/)?.[1];

  if (!code || !verifier) return NextResponse.redirect(new URL("/?auth=error", request.url));

  const response = await fetch(supabaseUrl + "/auth/v1/token?grant_type=pkce", {
    method: "POST",
    headers: { apikey: supabasePublishableKey, "content-type": "application/json" },
    body: JSON.stringify({ auth_code: code, code_verifier: decodeURIComponent(verifier) }),
  });

  if (!response.ok) return NextResponse.redirect(new URL("/?auth=error", request.url));

  const session = await response.json();
  const destination = NextResponse.redirect(new URL("/launch", request.url));
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  destination.cookies.set("eidolon_access_token", session.access_token, { ...cookieOptions, maxAge: session.expires_in ?? 3600 });
  destination.cookies.set("eidolon_refresh_token", session.refresh_token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
  destination.cookies.delete("eidolon_pkce_verifier");
  return destination;
}
