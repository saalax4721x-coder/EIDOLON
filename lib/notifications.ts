export type ActivityTask = { id: string; title: string; status: string; updated_at: string };
export type ActivityRun = { id: string; name: string; status: string; updated_at: string };
export type ActivityNotice = { id: string; title: string; detail: string; at: string; href: string; kind: "review" | "attention" | "complete" | "continue" };
export function companyNotices(companyId: string, tasks: ActivityTask[], runs: ActivityRun[]): ActivityNotice[] {
  const query = encodeURIComponent(companyId);
  const taskNotices: ActivityNotice[] = tasks.filter(t=>["failed","completed"].includes(t.status)).map(t=>({ id:`task:${t.id}`, title:t.title, detail:t.status === "failed" ? "Task failed. Open the work history to inspect the recorded error." : "Task completed. Its recorded output is available in the work history.", at:t.updated_at, href:`/company?companyId=${query}#foundry-operations`, kind:t.status === "failed" ? "attention" : "complete" }));
  const runNotices: ActivityNotice[] = runs.filter(r=>["ready","review","failed","completed"].includes(r.status)).map(r=>({id:`run:${r.id}`,title:r.name,detail:r.status === "review" ? "Waiting for owner review. Inspect the output before approving." : r.status === "ready" ? "Ready for the next step. Continue only when you want execution to proceed." : r.status === "failed" ? "Workflow failed. Inspect the run log before taking another action." : "Workflow completed. Review its saved steps and output.",at:r.updated_at,href:`/workflows?companyId=${query}`,kind:r.status === "review" ? "review" : r.status === "failed" ? "attention" : r.status === "ready" ? "continue" : "complete"}));
  return [...taskNotices,...runNotices].sort((a,b)=>(Date.parse(b.at)||0)-(Date.parse(a.at)||0));
}
