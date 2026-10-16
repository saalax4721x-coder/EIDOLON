import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";
import type { DiscoveryProject } from "@/lib/discovery";
import type { ProjectAction, ProjectType, ProjectRelationship } from "@/lib/eidolon";

export const dynamic = "force-dynamic";
type DbProject = {
  id: string; name: string; slug: string; type: ProjectType; description: string | null;
  economy: "none" | "token"; verification_status: "unverified" | "pending" | "verified" | "rejected"; created_at: string; updated_at: string;
};
type DbSource = { project_id: string; kind: DiscoveryProject["source"]["kind"]; reference: string; status: DiscoveryProject["source"]["status"]; };
type DbAction = { project_id: string; action: ProjectAction; enabled: boolean };
type DbRelationship = { id: string; source_project_id: string; target_project_id: string; relationship: ProjectRelationship };

export async function GET() {
  try {
  if (!supabaseUrl || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    return NextResponse.json({ projects: [], error: "Supabase is not configured." }, { status: 500 });

  const token=(await cookies()).get("eidolon_access_token")?.value;
  let authenticated = false;
  if (token) {
    try {
      const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { ...supabaseHeaders, Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (authResponse.ok) {
        const user = await authResponse.json().catch(() => null) as { id?: string } | null;
        authenticated = Boolean(user?.id);
      }
    } catch {
      authenticated = false;
    }
  }
  const authHeaders=token && authenticated?{...supabaseHeaders,Authorization:`Bearer ${token}`}:null;
  const [projectsResponse, sourcesResponse, actionsResponse, followsResponse, relationshipsResponse] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/projects?select=id,name,slug,type,description,economy,verification_status,created_at,updated_at&order=created_at.desc`, { headers: supabaseHeaders, cache: "no-store" }),
    fetch(`${supabaseUrl}/rest/v1/project_sources?select=project_id,kind,reference,status&order=verified_at.desc`, { headers: supabaseHeaders, cache: "no-store" }),
    fetch(`${supabaseUrl}/rest/v1/project_actions?select=project_id,action,enabled&enabled=eq.true`, { headers: supabaseHeaders, cache: "no-store" }),
    authHeaders ? fetch(`${supabaseUrl}/rest/v1/project_follows?select=project_id`, { headers: authHeaders, cache: "no-store" }) : Promise.resolve(null),
    fetch(`${supabaseUrl}/rest/v1/project_relationships?select=id,source_project_id,target_project_id,relationship`, { headers: supabaseHeaders, cache: "no-store" }),
  ]);
  if (!projectsResponse.ok || !sourcesResponse.ok || !actionsResponse.ok)
    return NextResponse.json({ projects: [], error: "Discovery data could not be loaded." }, { status: 502 });

  const projects = await projectsResponse.json() as DbProject[];
  const sources = await sourcesResponse.json() as DbSource[];
  const actions = await actionsResponse.json() as DbAction[];
  const follows = followsResponse?.ok ? await followsResponse.json() as Array<{project_id:string}> : [];
  if (!relationshipsResponse.ok) return NextResponse.json({ projects: [], error: "Network relationships could not be loaded." }, { status: 502 });
  const relationships = await relationshipsResponse.json() as DbRelationship[];
  const followed = new Set(follows.map((follow) => follow.project_id));
  const sourceByProject = new Map<string, DbSource>();
  for (const source of sources) if (!sourceByProject.has(source.project_id)) sourceByProject.set(source.project_id, source);
  const actionsByProject = new Map<string, ProjectAction[]>();
  for (const action of actions) {
    const current = actionsByProject.get(action.project_id) ?? [];
    current.push(action.action);
    actionsByProject.set(action.project_id, current);
  }

  const result: DiscoveryProject[] = projects.map((project) => {
    const source = sourceByProject.get(project.id);
    return {
      id: project.id, slug: project.slug, name: project.name, type: project.type,
      source: source ? { kind: source.kind, reference: source.reference, status: source.status } : { kind: "other", reference: "", status: project.verification_status },
      description: project.description ?? "", economy: project.economy, createdAt: project.created_at,
      actions: actionsByProject.get(project.id) ?? ["follow"], activityScore: null, followerCount: null, usageCount: null, updatedAt: project.updated_at,
      isFollowing: followed.has(project.id),
    };
  });
  return NextResponse.json({ projects: result, relationships: relationships.map((edge) => ({ id: edge.id, sourceProjectId: edge.source_project_id, targetProjectId: edge.target_project_id, relationship: edge.relationship })), authenticated });
  } catch {
    return NextResponse.json({ projects: [], relationships: [], error: "Discovery service is temporarily unavailable.", authenticated: false }, { status: 503 });
  }
}
