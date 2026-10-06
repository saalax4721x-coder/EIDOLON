import { githubApi, githubRepoFromReference } from "@/lib/github";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";

type VerifyResult = { verified: boolean; code: string };

export async function verifyGithubProject(projectId: string, eidolonToken: string, githubToken: string): Promise<VerifyResult> {
  const authHeaders = { ...supabaseHeaders, Authorization: "Bearer " + eidolonToken };
  const projectResponse = await fetch(supabaseUrl + "/rest/v1/projects?select=id,verification_status&id=eq." + encodeURIComponent(projectId) + "&limit=1", { headers: authHeaders, cache: "no-store" });
  if (!projectResponse.ok) throw new Error("project_lookup_failed");
  const projects = await projectResponse.json() as Array<{id:string;verification_status:string}>;
  if (!projects[0]) return { verified:false, code:"project_not_found" };

  const sourceResponse = await fetch(supabaseUrl + "/rest/v1/project_sources?select=kind,reference,status&project_id=eq." + encodeURIComponent(projectId) + "&limit=1", { headers: authHeaders, cache: "no-store" });
  if (!sourceResponse.ok) throw new Error("source_lookup_failed");
  const sources = await sourceResponse.json() as Array<{kind:string;reference:string;status:string}>;
  const source = sources[0];
  if (!source || source.kind !== "github") return { verified:false, code:"github_source_required" };

  const repo = githubRepoFromReference(source.reference);
  if (!repo) return { verified:false, code:"invalid_github_reference" };

  const response = await githubApi("/repos/" + encodeURIComponent(repo.owner) + "/" + encodeURIComponent(repo.repo), githubToken);
  if (response.status === 404) return { verified:false, code:"github_repository_not_accessible" };
  if (!response.ok) throw new Error("github_repository_lookup_failed");
  const data = await response.json() as { owner?:{login?:string}; permissions?:{admin?:boolean;push?:boolean;maintain?:boolean} };
  const controlled = Boolean(data.permissions?.admin) || Boolean(data.owner?.login && data.owner.login.toLowerCase() === repo.owner.toLowerCase());
  if (!controlled) return { verified:false, code:"github_control_not_proven" };

  const verifiedAt = new Date().toISOString();
  const sourceUpdate = await fetch(supabaseUrl + "/rest/v1/project_sources?project_id=eq." + encodeURIComponent(projectId) + "&kind=eq.github", {
    method: "PATCH",
    headers: { ...authHeaders, "Prefer":"return=minimal" },
    body: JSON.stringify({ status:"verified", verified_at:verifiedAt }),
  });
  if (!sourceUpdate.ok) throw new Error("source_update_failed");

  const projectUpdate = await fetch(supabaseUrl + "/rest/v1/projects?id=eq." + encodeURIComponent(projectId), {
    method: "PATCH",
    headers: { ...authHeaders, "Prefer":"return=minimal" },
    body: JSON.stringify({ verification_status:"verified" }),
  });
  if (!projectUpdate.ok) throw new Error("project_update_failed");

  return { verified:true, code:"verified" };
}
