import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseHeaders, supabaseUrl, supabasePublishableKey } from "@/lib/supabase-config";

export const dynamic = "force-dynamic";

async function readUser(accessToken: string) {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { ...supabaseHeaders, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const user = await response.json().catch(() => null) as { id?: string; email?: string } | null;
  return user?.id ? user : null;
}

async function refreshSession(refreshToken: string) {
  const response = await fetch(supabaseUrl + "/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    headers: { apikey: supabasePublishableKey, "content-type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  return await response.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number } | null;
}

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("eidolon_access_token")?.value;
  const refreshToken = cookieStore.get("eidolon_refresh_token")?.value;
  if (!accessToken && !refreshToken) return NextResponse.json({ authenticated: false }, { status: 401 });

  try {
    let user = accessToken ? await readUser(accessToken) : null;
    let session: { access_token?: string; refresh_token?: string; expires_in?: number } | null = null;

    if (!user && refreshToken) {
      session = await refreshSession(refreshToken);
      if (session?.access_token && session.refresh_token) user = await readUser(session.access_token);
    }

    if (!user) {
      const result = NextResponse.json({ authenticated: false }, { status: 401 });
      if (refreshToken) {
        for (const name of ["eidolon_access_token", "eidolon_refresh_token"]) {
          result.cookies.set(name, "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 0,
          });
        }
      }
      return result;
    }

    const result = NextResponse.json({ authenticated: true, user: { id: user.id, email: user.email ?? null } });
    if (session?.access_token && session.refresh_token) {
      const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
      };
      result.cookies.set("eidolon_access_token", session.access_token, { ...options, maxAge: session.expires_in ?? 3600 });
      result.cookies.set("eidolon_refresh_token", session.refresh_token, { ...options, maxAge: 60 * 60 * 24 * 30 });
    }
    return result;
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 503 });
  }
}
