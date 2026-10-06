import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseUrl, supabasePublishableKey } from "@/lib/supabase-config";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("eidolon_refresh_token")?.value;
  if (!refreshToken) return NextResponse.json({ error: "Refresh session unavailable." }, { status: 401 });

  const response = await fetch(supabaseUrl + "/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    headers: { apikey: supabasePublishableKey, "content-type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });
  if (!response.ok) {
    const result = NextResponse.json({ error: "Refresh session expired." }, { status: 401 });
    for (const name of ["eidolon_access_token", "eidolon_refresh_token"]) {
      result.cookies.set(name, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
    }
    return result;
  }

  const session = await response.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number } | null;
  if (!session?.access_token || !session.refresh_token) {
    return NextResponse.json({ error: "Invalid refresh response." }, { status: 502 });
  }

  const result = NextResponse.json({ ok: true });
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  result.cookies.set("eidolon_access_token", session.access_token, { ...options, maxAge: session.expires_in ?? 3600 });
  result.cookies.set("eidolon_refresh_token", session.refresh_token, { ...options, maxAge: 60 * 60 * 24 * 30 });
  return result;
}