import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseUrl, supabasePublishableKey } from "@/lib/supabase-config";
import { safeAuthNext } from "@/lib/auth-redirect";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const verifier = cookieStore.get("eidolon_pkce_verifier")?.value;
  const next = safeAuthNext(cookieStore.get("eidolon_auth_next")?.value);
  const failed = () => {
    const location = new URL("/auth", request.url);
    location.searchParams.set("error", "invalid_link");
    location.searchParams.set("next", next);
    const result = NextResponse.redirect(location);
    result.cookies.delete("eidolon_pkce_verifier");
    result.cookies.delete("eidolon_auth_next");
    return result;
  };

  if (!code || !verifier || !/^[A-Za-z0-9_-]{43,128}$/.test(verifier)) return failed();

  try {
    const response = await fetch(supabaseUrl + "/auth/v1/token?grant_type=pkce", {
      method: "POST",
      headers: { apikey: supabasePublishableKey, "content-type": "application/json" },
      body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) return failed();

    const session = await response.json() as { access_token?: unknown; refresh_token?: unknown; expires_in?: unknown } | null;
    if (!session || typeof session.access_token !== "string" || !session.access_token || typeof session.refresh_token !== "string" || !session.refresh_token) return failed();
    const destination = NextResponse.redirect(new URL(next, request.url));
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };

    const expiresIn = typeof session.expires_in === "number" && Number.isFinite(session.expires_in) && session.expires_in > 0 ? Math.min(Math.floor(session.expires_in), 86400) : 3600;
    destination.cookies.set("eidolon_access_token", session.access_token, { ...cookieOptions, maxAge: expiresIn });
    destination.cookies.set("eidolon_refresh_token", session.refresh_token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
    destination.cookies.delete("eidolon_pkce_verifier");
    destination.cookies.delete("eidolon_auth_next");
    return destination;
  } catch { return failed(); }
}
