import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("eidolon_access_token")?.value;
  const response = NextResponse.json({ ok: true });
  if (accessToken) {
    await fetch(supabaseUrl + "/auth/v1/logout?scope=local", {
      method: "POST",
      headers: { ...supabaseHeaders, Authorization: "Bearer " + accessToken },
      cache: "no-store",
    }).catch(() => undefined);
  }
  for (const name of ["eidolon_access_token", "eidolon_refresh_token"]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}