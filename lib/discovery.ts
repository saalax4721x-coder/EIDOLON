import type { Project } from "@/lib/eidolon";

export interface DiscoveryProject extends Project {
  activityScore: number | null;
  followerCount: number | null;
  usageCount: number | null;
  updatedAt: string | null;
}

export const discoverySort = (projects: DiscoveryProject[], mode: "Trending" | "Rising" | "New" | "Undiscovered") =>
  [...projects].sort((a, z) => {
    if (mode === "New") return (Date.parse(z.createdAt) || 0) - (Date.parse(a.createdAt) || 0);
    if (mode === "Undiscovered") return (a.activityScore ?? 0) - (z.activityScore ?? 0);
    return (z.activityScore ?? 0) - (a.activityScore ?? 0);
  });

export const discoveryMatches = (project: DiscoveryProject, query: string) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [project.name, project.slug, project.description, project.type, project.source.reference]
    .some((value) => value.toLowerCase().includes(needle));
};

export const visibleMetric = (value: number | null) => value === null ? "—" : value.toLocaleString();
