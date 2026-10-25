import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { supabaseUrl, supabasePublishableKey } from "@/lib/supabase-config";
import { safeAuthNext } from "@/lib/auth-redirect";

const base64Url = (input: Buffer) =>
  input.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = body?.email;
  const next = safeAuthNext(body?.next);
  if (typeof email !== "string" || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  const origin = new URL(request.url).origin;

  try {
    // This is the raw Auth API, not the supabase-js options object. PKCE fields
    // belong in the request body and the email destination is a query parameter.
    const endpoint = new URL(supabaseUrl + "/auth/v1/otp");
    endpoint.searchParams.set("redirect_to", origin + "/api/auth/callback");
    const response = await fetch(
      endpoint.toString(),
      {
        method: "POST",
        headers: { apikey: supabasePublishableKey, "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          create_user: true,
          data: {},
          code_challenge: challenge,
          code_challenge_method: "s256",
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      },
    );

    if (!response.ok) {
      return NextResponse.json({ error: response.status === 429 ? "Too many sign-in requests. Wait a moment and try again." : "Unable to send a sign-in link. Check the email address and try again." }, { status: response.status === 429 ? 429 : 502 });
    }

    const result = NextResponse.json({ ok: true });
    result.cookies.set("eidolon_pkce_verifier", verifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    result.cookies.set("eidolon_auth_next", next, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return result;
  } catch {
    return NextResponse.json({ error: "Sign-in service could not be reached. Please try again." }, { status: 503 });
  }
}
