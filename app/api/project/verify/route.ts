import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decryptSecret } from "@/lib/github";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";
import { verifyGithubProject } from "@/lib/github-verification";

export async function POST(request: Request) {
  const eidolonToken = (await cookies()).get("eidolon_access_token")?.value;
  if (!eidolonToken) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { projectId?: string } | null;
  const projectId = body?.projectId?.trim();
  if (!projectId) return NextResponse.json({ error: "Missing project id." }, { status: 400 });

  const response = await fetch(
    supabaseUrl + "/rest/v1/provider_connections?select=access_token_ciphertext,expires_at&provider=eq.github&limit=1",
    { headers: { ...supabaseHeaders, Authorization: "Bearer " + eidolonToken }, cache: "no-store" },
  );
  if (!response.ok) return NextResponse.json({ error: "GitHub connection could not be loaded." }, { status: 502 });
  const connections = await response.json() as Array<{access_token_ciphertext:string;expires_at:string|null}>;
  if (!connections[0]) return NextResponse.json({ error: "Connect GitHub before verifying this source." }, { status: 409 });
  if (connections[0].expires_at && Date.parse(connections[0].expires_at) <= Date.now())
    return NextResponse.json({ error: "Your GitHub connection has expired. Reconnect GitHub." }, { status: 409 });

  try {
    const result = await verifyGithubProject(projectId, eidolonToken, decryptSecret(connections[0].access_token_ciphertext));
    if (!result.verified) return NextResponse.json({ status: "pending", code: result.code, message: result.code === "github_control_not_proven" ? "GitHub is connected, but control of this repository could not be proven." : "The GitHub source could not be verified." }, { status: 422 });
    return NextResponse.json({ status: "verified", message: "GitHub control verified from the connected account." });
  } catch {
    return NextResponse.json({ error: "GitHub verification failed. Try reconnecting and checking the repository reference." }, { status: 502 });
  }
}
