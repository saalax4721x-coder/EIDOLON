import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";

export const dynamic = "force-dynamic";

async function authToken() {
  return (await cookies()).get("eidolon_access_token")?.value ?? null;
}

export async function GET() {
  try {
    const token = await authToken();
    if (!token) {
      return NextResponse.json({ connected: false }, { status: 401 });
    }

    const authResponse = await fetch(supabaseUrl + "/auth/v1/user", {
      headers: { ...supabaseHeaders, Authorization: "Bearer " + token },
      cache: "no-store",
    });

    if (authResponse.status === 401 || authResponse.status === 403) {
      return NextResponse.json({ connected: false, error: "Your session has expired." }, { status: 401 });
    }

    if (!authResponse.ok) {
      return NextResponse.json({ error: "Authentication status could not be verified." }, { status: 502 });
    }

    const user = await authResponse.json() as { id?: string };
    if (!user.id) {
      return NextResponse.json({ connected: false }, { status: 401 });
    }

    const response = await fetch(
      supabaseUrl + "/rest/v1/provider_connections?select=provider,provider_login,scopes,expires_at,updated_at&provider=eq.github&limit=1",
      { headers: { ...supabaseHeaders, Authorization: "Bearer " + token }, cache: "no-store" },
    );

    if (!response.ok) {
      return NextResponse.json({ error: "GitHub connection status could not be loaded." }, { status: 502 });
    }

    const rows = await response.json() as Array<{
      provider: string;
      provider_login: string;
      scopes: string[];
      expires_at: string | null;
      updated_at: string;
    }>;

    const connection = rows[0];
    if (!connection) return NextResponse.json({ connected: false });

    const expiresAt = connection.expires_at ? Date.parse(connection.expires_at) : null;
    const expired = expiresAt !== null && Number.isFinite(expiresAt) && expiresAt <= Date.now();

    return NextResponse.json({
      connected: !expired,
      expired,
      provider: connection.provider,
      login: connection.provider_login,
      scopes: connection.scopes,
      updatedAt: connection.updated_at,
    });
  } catch {
    return NextResponse.json(
      { error: "GitHub connection status is temporarily unavailable." },
      { status: 503 },
    );
  }
}
