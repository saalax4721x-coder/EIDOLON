import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = (await cookies()).get("eidolon_access_token")?.value;
  if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { ...supabaseHeaders, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ authenticated: false }, { status: 401 });
    const user = await response.json() as { id?: string; email?: string };
    if (!user.id) return NextResponse.json({ authenticated: false }, { status: 401 });
    return NextResponse.json({ authenticated: true, user: { id: user.id, email: user.email ?? null } });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 503 });
  }
}