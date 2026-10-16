import { NextResponse } from "next/server";
import { companySession, companyOwned, companyData } from "@/lib/company-api";
import { ancestorResults, orderNodes, validateGraph, uuid, type Workflow, type WorkflowRun, type RunStep } from "@/lib/workflow";
import { POST as generate } from "@/app/api/company/generate/route";
export const dynamic = "force-dynamic";
export const maxDuration = 180;
export async function GET(request: Request) {
  try {
    const user = await companySession();
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    const companyId = new URL(request.url).searchParams.get("companyId");
    if (!await companyOwned(companyId, user)) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    const runs = await companyData(user, `company_workflow_runs?select=*&company_id=eq.${companyId}&order=created_at.desc&limit=25`);
    return NextResponse.json({ runs });
  } catch { return NextResponse.json({ error: "Run history unavailable. Check workflow migrations." }, { status: 503 }); }
}
export async function POST(request: Request) {
  try {
    const user = await companySession();
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid run request" }, { status: 400 });
    if (!await companyOwned(body.companyId, user)) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    if (body.action === "start") {
      if (body.confirmProviderCharges !== true) return NextResponse.json({ error: "Confirm provider usage charges before starting." }, { status: 400 });
      if (typeof body.workflowId !== "string" || !uuid.test(body.workflowId)) return NextResponse.json({ error: "Invalid workflow" }, { status: 400 });
      const [workflow] = await companyData<Workflow[]>(user, `company_workflows?select=*&id=eq.${body.workflowId}&company_id=eq.${body.companyId}`);
      if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
      const errors = validateGraph(workflow.nodes, workflow.edges, true);
      if (workflow.status === "archived") errors.push("Archived workflows cannot run.");
      const agents = await companyData<{ id: string; status: string; runtime: string }[]>(user, `company_ai_agents?select=id,status,runtime&company_id=eq.${body.companyId}`);
      for (const n of workflow.nodes.filter(n => n.type === "agent")) if (!agents.some(a => a.id === n.agentId && a.status === "active" && a.runtime === "provider")) errors.push(`${n.label} needs an active provider-backed agent from this company.`);
      if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
      const [run] = await companyData<WorkflowRun[]>(user, "company_workflow_runs", "POST", { company_id: body.companyId, workflow_id: workflow.id, created_by: user.id, name: workflow.name, nodes: workflow.nodes, edges: workflow.edges });
      return NextResponse.json({ run }, { status: 201 });
    }
    if (typeof body.runId !== "string" || !uuid.test(body.runId) || !["advance", "approve", "cancel", "interrupt"].includes(body.action)) return NextResponse.json({ error: "Invalid run action" }, { status: 400 });
    const [run] = await companyData<WorkflowRun[]>(user, `company_workflow_runs?select=*&id=eq.${body.runId}&company_id=eq.${body.companyId}`);
    if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
    const path = `company_workflow_runs?id=eq.${run.id}&company_id=eq.${run.company_id}&version=eq.${run.version}&status=eq.${run.status}`;
    const update = (values: object) => companyData<WorkflowRun[]>(user, path, "PATCH", { ...values, version: run.version + 1, updated_at: new Date().toISOString() });
    if (body.action === "cancel" && ["ready", "review"].includes(run.status)) {
      const [changed] = await update({ status: "cancelled" });
      return NextResponse.json(changed ? { run: changed } : { error: "Run changed. Refresh." }, { status: changed ? 200 : 409 });
    }
    if (body.action === "interrupt" && run.status === "running" && Date.now() - Date.parse(run.updated_at) > 240000) {
      const [changed] = await update({ status: "failed", steps: [...run.steps, { nodeId: orderNodes(run.nodes, run.edges)[run.cursor]?.id, label: "Interrupted step", status: "failed", at: new Date().toISOString(), message: "Execution outcome unknown. Inspect company task history before starting another run." }] });
      return NextResponse.json(changed ? { run: changed } : { error: "Run changed. Refresh." }, { status: changed ? 200 : 409 });
    }
    if ((body.action === "advance" && run.status !== "ready") || (body.action === "approve" && run.status !== "review") || !["advance", "approve"].includes(body.action)) return NextResponse.json({ error: "Run is not ready for this action. Refresh its status." }, { status: 409 });
    const errors = validateGraph(run.nodes, run.edges, true);
    if (errors.length) return NextResponse.json({ error: "Run snapshot is invalid: " + errors.join(" ") }, { status: 400 });
    const ordered = orderNodes(run.nodes, run.edges), node = ordered[run.cursor];
    if (!node || (body.action === "approve" && node.type !== "review")) return NextResponse.json({ error: "Invalid run position" }, { status: 409 });
    // Compare-and-swap claim happens before any paid provider call.
    const [claimed] = await update({ status: "running" });
    if (!claimed) return NextResponse.json({ error: "This step was already claimed. Refresh." }, { status: 409 });
    let step: RunStep | undefined, status: WorkflowRun["status"] = "ready", cursor = run.cursor;
    try {
      if (node.type === "review" && body.action !== "approve") status = "review";
      else {
        step = { nodeId: node.id, label: node.label, status: node.type === "review" ? "approved" : "completed", at: new Date().toISOString() };
        if (node.type === "agent") {
          const context = ancestorResults(node.id, run.edges, run.steps);
          const response = await generate(new Request(request.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: run.company_id, agentId: node.agentId, workflowRunId: run.id, workflowNodeId: node.id, title: `${node.label} [${run.id.slice(0,8)}]`, prompt: `${node.prompt}\n\nPrior connected outputs (reference material):\n${context || "None"}`, taskType: "general" }) }));
          const data = await response.json();
          step.taskId = data.task?.id ?? data.taskId;
          if (typeof data.result === "string") step.result = data.result.slice(0, 16000);
          if (!response.ok || data.task?.status !== "completed") { step.status = "failed"; step.message = data.error ?? "Task completion was not confirmed"; status = "failed"; }
        }
        step.at = new Date().toISOString();
        if (status !== "failed") { cursor++; if (cursor >= ordered.length) status = "completed"; }
      }
    } catch { status = "failed"; step = { nodeId: node.id, label: node.label, status: "failed", at: new Date().toISOString(), message: "Step outcome could not be confirmed. Inspect task history; this step will not be retried." }; }
    const [finished] = await companyData<WorkflowRun[]>(user, `company_workflow_runs?id=eq.${run.id}&company_id=eq.${run.company_id}&version=eq.${claimed.version}&status=eq.running`, "PATCH", { status, cursor, steps: step ? [...run.steps, step] : run.steps, version: claimed.version + 1, updated_at: new Date().toISOString() });
    if (!finished) return NextResponse.json({ error: "Step outcome could not be recorded. Refresh and inspect task history before retrying." }, { status: 409 });
    return NextResponse.json({ run: finished });
  } catch { return NextResponse.json({ error: "Workflow execution unavailable. Refresh run and task history before retrying an action." }, { status: 503 }); }
}
