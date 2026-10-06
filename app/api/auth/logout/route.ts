import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseUrl, supabasePublishableKey } from "@/lib/supabase-config";

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("eidolon_access_token")?.value;
  const isProduction = process.env.NODE_ENV === "production";

  if (accessToken) {
    await fetch(supabaseUrl + "/auth/v1/logout?scope=local", {
      method: "POST",
      headers: {
        apikey: supabasePublishableKey,
        Authorization: "Bearer " + accessToken,
      },
      cache: "no-store",
    }).catch(() => undefined);
  }

  const result = NextResponse.json({ ok: true });
  const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };

  result.cookies.set("eidolon_access_token", "", options);
  result.cookies.set("eidolon_refresh_token", "", options);
  return result;
}
