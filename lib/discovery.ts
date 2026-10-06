import type { Project, ProjectAction } from "@/lib/eidolon";

export interface DiscoveryProject extends Project {
  activityScore: number | null;
  followerCount: number | null;
  usageCount: number | null;
  updatedAt: string | null;
  isFollowing?: boolean;
}

export const discoverySort = (projects: DiscoveryProject[], filter: string) => {
  if (filter === "New") return [...projects].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  if (filter === "Rising") return [...projects].sort((a,b) => (b.activityScore ?? -1) - (a.activityScore ?? -1));
  if (filter === "Trending") return [...projects].sort((a,b) => (b.activityScore ?? -1) - (a.activityScore ?? -1));
  if (filter === "Undiscovered") return [...projects].sort((a,b) => (a.followerCount ?? Number.MAX_SAFE_INTEGER) - (b.followerCount ?? Number.MAX_SAFE_INTEGER));
  if (filter === "Following") return projects.filter((project) => project.isFollowing);
  return projects;
};

export const discoveryMatches = (project: DiscoveryProject, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [project.name, project.slug, project.description, project.type, project.source.reference].some((value) => value.toLowerCase().includes(q));
};

export const visibleMetric = (value: number | null) => value === null ? "—" : value.toLocaleString();
