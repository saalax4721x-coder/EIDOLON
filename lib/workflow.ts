export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type WorkflowNode = { id: string; type: "trigger" | "agent" | "review" | "end"; label: string; agentId?: string; prompt?: string; x: number; y: number };
export type WorkflowEdge = { id: string; source: string; target: string };
export type Workflow = { id: string; name: string; description: string; nodes: WorkflowNode[]; edges: WorkflowEdge[]; status: string; updated_at: string };
export type RunStep = { nodeId: string; label: string; status: "completed" | "failed" | "approved"; at: string; taskId?: string; message?: string; result?: string };
export type WorkflowRun = { id: string; workflow_id: string; company_id: string; name: string; nodes: WorkflowNode[]; edges: WorkflowEdge[]; status: "ready" | "running" | "review" | "completed" | "failed" | "cancelled"; cursor: number; version: number; steps: RunStep[]; created_at: string; updated_at: string };

// Drafts may be incomplete. Execution requires a connected, bounded DAG with
// exactly one entry and exit; every node must lie on a path between them.
export function validateGraph(nodes: unknown, edges: unknown, executable = false): string[] {
  if (!Array.isArray(nodes) || !Array.isArray(edges) || nodes.length > 50 || edges.length > 100) return ["A graph supports at most 50 nodes and 100 connections."];
  const ids = new Set<string>();
  for (const n of nodes) {
    if (!n || typeof n.id !== "string" || !uuid.test(n.id) || ids.has(n.id) || !["trigger", "agent", "review", "end"].includes(n.type) || typeof n.label !== "string" || !n.label.trim() || n.label.length > 100 || !Number.isFinite(n.x) || !Number.isFinite(n.y) || Math.abs(n.x) > 10000 || Math.abs(n.y) > 10000 || (n.agentId !== undefined && (typeof n.agentId !== "string" || !uuid.test(n.agentId))) || (n.prompt !== undefined && (typeof n.prompt !== "string" || n.prompt.length > 8000))) return ["Invalid or duplicate node. Check labels, positions and agent assignments."];
    ids.add(n.id);
  }
  const pairs = new Set<string>(), edgeIds = new Set<string>();
  for (const e of edges) {
    if (!e || typeof e.id !== "string" || !uuid.test(e.id) || edgeIds.has(e.id) || !ids.has(e.source) || !ids.has(e.target) || e.source === e.target || pairs.has(e.source + ":" + e.target)) return ["Connections must be unique and join two existing, different nodes."];
    edgeIds.add(e.id); pairs.add(e.source + ":" + e.target);
  }
  const ordered = orderNodes(nodes, edges);
  if (ordered.length !== nodes.length) return ["Workflow connections contain a cycle."];
  if (!executable) return [];
  const errors: string[] = [];
  const start = nodes.filter(n => n.type === "trigger"), end = nodes.filter(n => n.type === "end");
  if (start.length !== 1 || end.length !== 1) errors.push("Execution requires exactly one start and one finish node.");
  if (!nodes.some(n => n.type === "agent")) errors.push("Add at least one agent action.");
  for (const n of nodes) {
    if (n.type !== "trigger" && !edges.some(e => e.target === n.id)) errors.push(`${n.label} needs an incoming connection.`);
    if (n.type !== "end" && !edges.some(e => e.source === n.id)) errors.push(`${n.label} needs an outgoing connection.`);
    if (n.type === "trigger" && edges.some(e => e.target === n.id)) errors.push("Start cannot have incoming connections.");
    if (n.type === "end" && edges.some(e => e.source === n.id)) errors.push("Finish cannot have outgoing connections.");
    if (n.type === "agent" && (!n.agentId || !n.prompt || n.prompt.trim().length < 5)) errors.push(`${n.label} needs an agent and an instruction of at least 5 characters.`);
    if (n.type === "agent" && n.label.trim().length < 2) errors.push("Agent action labels need at least 2 characters for their task titles.");
  }
  return errors;
}

export function orderNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  const pending = new Map(nodes.map(n => [n.id, edges.filter(e => e.target === n.id).length]));
  const queue = nodes.filter(n => pending.get(n.id) === 0), ordered: WorkflowNode[] = [];
  for (let i = 0; i < queue.length; i++) {
    const n = queue[i]; ordered.push(n);
    for (const e of edges.filter(e => e.source === n.id)) {
      pending.set(e.target, (pending.get(e.target) ?? 0) - 1);
      if (pending.get(e.target) === 0) { const next = nodes.find(n => n.id === e.target); if (next) queue.push(next); }
    }
  }
  return ordered;
}

export function ancestorResults(nodeId: string, edges: WorkflowEdge[], steps: RunStep[]): string {
  const ancestors = new Set<string>();
  const visit = (id: string) => { for (const e of edges.filter(e => e.target === id)) if (!ancestors.has(e.source)) { ancestors.add(e.source); visit(e.source); } };
  visit(nodeId);
  return steps.filter(s => ancestors.has(s.nodeId) && s.result).map(s => `${s.label}:\n${s.result!.slice(0, 2000)}`).join("\n\n").slice(0, 3500);
}

export function workflowTemplate(): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const nodes: WorkflowNode[] = [
    { id: crypto.randomUUID(), type: "trigger", label: "Start", x: 40, y: 170 },
    { id: crypto.randomUUID(), type: "agent", label: "Prepare deliverable", prompt: "Prepare a useful company action plan. State assumptions and next steps.", x: 300, y: 90 },
    { id: crypto.randomUUID(), type: "review", label: "Owner review", x: 560, y: 230 },
    { id: crypto.randomUUID(), type: "end", label: "Finish", x: 820, y: 130 },
  ];
  return { nodes, edges: nodes.slice(1).map((n, i) => ({ id: crypto.randomUUID(), source: nodes[i].id, target: n.id })) };
}
