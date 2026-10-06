import { NextResponse } from "next/server";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";
import type { DiscoveryProject } from "@/lib/discovery";

export const dynamic = "force-dynamic";

type DbProject = {
  id: string; name: string; slug: string; type: string; description: string | null;
  economy: "none" | "token"; verification_status: "unverified" | "pending" | "verified" | "rejected"; created_at: string; updated_at: string;
};
type DbSource = { project_id: string; kind: DiscoveryProject["source"]["kind"]; reference: string; status: DiscoveryProject["source"]["status"]; };

export async function GET() {
  if (!supabaseUrl || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    return NextResponse.json({ projects: [], error: "Supabase is not configured." }, { status: 500 });

  const [projectsResponse, sourcesResponse] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/projects?select=id,name,slug,type,description,economy,verification_status,created_at,updated_at&order=created_at.desc`, { headers: supabaseHeaders, cache: "no-store" }),
    fetch(`${supabaseUrl}/rest/v1/project_sources?select=project_id,kind,reference,status&order=verified_at.desc`, { headers: supabaseHeaders, cache: "no-store" }),
  ]);
  if (!projectsResponse.ok || !sourcesResponse.ok)
    return NextResponse.json({ projects: [], error: "Discovery data could not be loaded." }, { status: 502 });

  const projects = await projectsResponse.json() as DbProject[];
  const sources = await sourcesResponse.json() as DbSource[];
  const sourceByProject = new Map<string, DbSource>();
  for (const source of sources) if (!sourceByProject.has(source.project_id)) sourceByProject.set(source.project_id, source);

  const result: DiscoveryProject[] = projects.map((project) => {
    const source = sourceByProject.get(project.id);
    return {
      id: project.id, slug: project.slug, name: project.name, type: project.type,
      source: source ? { kind: source.kind, reference: source.reference, status: source.status } : { kind: "other", reference: "", status: project.verification_status },
      description: project.description ?? "", economy: project.economy, createdAt: project.created_at,
      actions: [], activityScore: null, followerCount: null, usageCount: null, updatedAt: project.updated_at,
    };
  });
  return NextResponse.json({ projects: result });
}
