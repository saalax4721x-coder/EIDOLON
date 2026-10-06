export const projectTypes = ["Website","Web app","App","GitHub project","API","Game","AI product","Dataset","Digital asset","Creator / business","Protocol","Other"] as const;
export type ProjectType = typeof projectTypes[number];
export type EconomyMode = "none" | "token";
export const discoveryFilters = ["Trending","Rising","New","Undiscovered","Following"] as const;
