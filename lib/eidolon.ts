export const projectTypes = ["Website","Web app","App","GitHub project","API","Game","AI product","Dataset","Digital asset","Creator / business","Protocol","Other"] as const;
export type ProjectType = typeof projectTypes[number];

export type EconomyMode = "none" | "token";
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export type SourceKind = "github" | "domain" | "wallet" | "app_store" | "play_store" | "game" | "brokerage" | "other";

export type ProjectAction =
  | "use" | "buy" | "sell" | "fund" | "subscribe" | "license"
  | "sponsor" | "bounty" | "contribute" | "rent" | "borrow"
  | "predict" | "trade" | "compose" | "reserve" | "follow";

export interface VerifiedSource {
  kind: SourceKind;
  reference: string;
  status: VerificationStatus;
  verifiedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  type: ProjectType;
  description: string;
  source: VerifiedSource;
  economy: EconomyMode;
  createdAt: string;
  actions: ProjectAction[];
}

export const discoveryFilters = ["Trending","Rising","New","Undiscovered","Following"] as const;

export const projectActionLabels: Record<ProjectAction, string> = {
  use: "Use", buy: "Buy", sell: "Sell", fund: "Fund", subscribe: "Subscribe",
  license: "License", sponsor: "Sponsor", bounty: "Bounty", contribute: "Contribute",
  rent: "Rent", borrow: "Borrow", predict: "Predict", trade: "Trade",
  compose: "Compose", reserve: "Reserve", follow: "Follow",
};

export const projectActionDescriptions: Record<ProjectAction, string> = {
  use: "Open or use the underlying project.",
  buy: "Buy a real asset or product where supported.",
  sell: "Sell an asset you actually control where supported.",
  fund: "Provide funding to the project.",
  subscribe: "Subscribe to an available service or capacity.",
  license: "License software, content, data or IP.",
  sponsor: "Support the project or its maintainers.",
  bounty: "Create or claim a contribution bounty.",
  contribute: "Contribute work, capital or resources.",
  rent: "Rent an eligible asset or capacity.",
  borrow: "Borrow an eligible asset or capacity.",
  predict: "Enter an eligible prediction market.",
  trade: "Trade an eligible market instrument.",
  compose: "Build something using this project.",
  reserve: "Reserve an available resource or capacity.",
  follow: "Follow the project and its updates.",
};

export const canShowAction = (project: Project, action: ProjectAction) =>
  project.actions.includes(action);

export const createProjectSlug = (name: string) =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const isVerified = (source: VerifiedSource) => source.status === "verified";
