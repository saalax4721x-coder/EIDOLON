import type { EconomyMode, ProjectType } from "@/lib/eidolon";
import { createProjectSlug } from "@/lib/eidolon";

export interface ProjectDraft {
  name: string;
  source: string;
  description: string;
  type: ProjectType | null;
  economy: EconomyMode;
}

export const emptyProjectDraft: ProjectDraft = {
  name: "",
  source: "",
  description: "",
  type: null,
  economy: "none",
};

export const projectDraftIsReady = (draft: ProjectDraft) =>
  Boolean(
    draft.type &&
    draft.name.trim().length >= 2 &&
    draft.source.trim().length >= 4 &&
    draft.description.trim().length >= 10,
  );

export const projectDraftSlug = (draft: ProjectDraft) => createProjectSlug(draft.name);
