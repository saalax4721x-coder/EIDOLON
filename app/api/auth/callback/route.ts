import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseUrl, supabasePublishableKey } from "@/lib/supabase-config";

const safeNext = (value: string | undefined) => {
  if (!value) return "/launch";
  const decoded = decodeURIComponent(value);
  return decoded.startsWith("/") && !decoded.startsWith("//") ? decoded : "/launch";
};

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const verifier = cookieStore.get("eidolon_pkce_verifier")?.value;
  const next = safeNext(cookieStore.get("eidolon_auth_next")?.value);

  if (!code || !verifier) return NextResponse.redirect(new URL("/?auth=error", request.url));

  const response = await fetch(supabaseUrl + "/auth/v1/token?grant_type=pkce", {
    method: "POST",
    headers: { apikey: supabasePublishableKey, "content-type": "application/json" },
    body: JSON.stringify({ auth_code: code, code_verifier: decodeURIComponent(verifier) }),
  });

  if (!response.ok) return NextResponse.redirect(new URL("/?auth=error", request.url));

  const session = await response.json();
  const destination = NextResponse.redirect(new URL(next, request.url));
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  destination.cookies.set("eidolon_access_token", session.access_token, { ...cookieOptions, maxAge: session.expires_in ?? 3600 });
  destination.cookies.set("eidolon_refresh_token", session.refresh_token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
  destination.cookies.delete("eidolon_pkce_verifier");
  destination.cookies.delete("eidolon_auth_next");
  return destination;
}