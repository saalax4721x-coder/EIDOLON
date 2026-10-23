import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decryptAiCredential } from "@/lib/ai-credentials";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";
import { orderNodes, uuid, type WorkflowRun } from "@/lib/workflow";

export const dynamic = "force-dynamic";
export const maxDuration = 180;
type Provider = "openai" | "anthropic" | "openrouter";
async function auth() {
  const token = (await cookies()).get("eidolon_access_token")?.value;
  if (!token) return null;
  const headers = { ...supabaseHeaders, Authorization: `Bearer ${token}` };
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, { headers, cache: "no-store" });
  if (!response.ok) return null;
  const user = await response.json() as { id?: string };
  return user.id ? { id: user.id, headers } : null;
}
async function owns(companyId: string, userId: string, headers: Record<string,string>) {
  const response = await fetch(`${supabaseUrl}/rest/v1/companies?select=id,name,mission,industry,business_model,target_customer&owner_id=eq.${encodeURIComponent(userId)}&id=eq.${encodeURIComponent(companyId)}&limit=1`, { headers, cache: "no-store" });
  if (!response.ok) return null;
  return ((await response.json()) as Array<{id:string;name:string;mission:string;industry:string;business_model:string;target_customer:string}>)[0] ?? null;
}
function extractText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const data = value as Record<string, unknown>;
  if (typeof data.output_text === "string") return data.output_text;
  if (Array.isArray(data.content)) return data.content.map((part) => part && typeof part === "object" && typeof (part as Record<string,unknown>).text === "string" ? (part as Record<string,string>).text : "").filter(Boolean).join("\n");
  if (Array.isArray(data.output)) return data.output.flatMap((item) => item && typeof item === "object" && Array.isArray((item as Record<string,unknown>).content) ? ((item as Record<string,unknown>).content as unknown[]).map((part) => part && typeof part === "object" && typeof (part as Record<string,unknown>).text === "string" ? (part as Record<string,string>).text : "") : []).filter(Boolean).join("\n");
  if (Array.isArray(data.choices)) {
    const first = data.choices[0] as Record<string,unknown> | undefined;
    const message = first?.message as Record<string,unknown> | undefined;
    return typeof message?.content === "string" ? message.content : "";
  }
  return "";
}
async function runProvider(provider: Provider, key: string, model: string, prompt: string) {
  const signal = AbortSignal.timeout(90000);
  let url: string;
  let headers: Record<string,string>;
  let body: Record<string,unknown>;
  if (provider === "anthropic") {
    url = "https://api.anthropic.com/v1/messages";
    headers = { "x-api-key":key, "anthropic-version":"2023-06-01", "content-type":"application/json" };
    body = { model, max_tokens:5000, messages:[{role:"user",content:prompt}] };
  } else if (provider === "openrouter") {
    url = "https://openrouter.ai/api/v1/chat/completions";
    headers = { Authorization:`Bearer ${key}`, "content-type":"application/json" };
    body = { model, messages:[{role:"user",content:prompt}], temperature:0.4 };
  } else {
    url = "https://api.openai.com/v1/responses";
    headers = { Authorization:`Bearer ${key}`, "content-type":"application/json" };
    body = { model, input:prompt };
  }
  const response = await fetch(url,{method:"POST",headers,body:JSON.stringify(body),cache:"no-store",signal});
  if (!response.ok) {
    const status = response.status;
    if (status === 401 || status === 403) throw new Error("provider_auth_rejected");
    if (status === 429) throw new Error("provider_rate_limited");
    throw new Error("provider_request_failed");
  }
  const data = await response.json();
  const text = extractText(data);
  if (!text.trim()) throw new Error("provider_empty_output");
  return text.trim();
}
export async function POST(request: Request) {
  let taskId = "";
  let user: Awaited<ReturnType<typeof auth>> = null;
  try {
    user = await auth();
    if (!user) return NextResponse.json({error:"Sign in to run company work."},{status:401});
    let input: Record<string,unknown>;
    try { input = await request.json(); } catch { return NextResponse.json({error:"Invalid generation request."},{status:400}); }
    const companyId = typeof input.companyId === "string" ? input.companyId : "";
    let connectionId = typeof input.connectionId === "string" ? input.connectionId : "";
    const agentId = typeof input.agentId === "string" ? input.agentId : "";
    let model = typeof input.model === "string" ? input.model.trim().slice(0,160) : "";
    let agentContext = "No named AI employee was assigned.";
    let title = typeof input.title === "string" ? input.title.trim().slice(0,180) : "";
    const existingTaskId = typeof input.taskId === "string" ? input.taskId : "";
    let objective = typeof input.prompt === "string" ? input.prompt.trim().slice(0,12000) : "";
    let taskType = ["planning","research","content","marketing","customer_acquisition","sales","service_operations","product","coding","operations","general"].includes(String(input.taskType)) ? String(input.taskType) : "general";
    let assignedAgentId: string | null = null;
    let assignedAgentProvider: string | null = null;
    if (!companyId || (!agentId && (!connectionId || !model)) || (!existingTaskId && (title.length < 2 || objective.length < 5))) return NextResponse.json({error:"Choose a company, active agent or connected provider and model, task title and a clear instruction."},{status:400});
    const company = await owns(companyId,user.id,user.headers);
    if (!company) return NextResponse.json({error:"Company not found or access denied."},{status:404});
    const workflowRunId = typeof input.workflowRunId === "string" ? input.workflowRunId : "";
    const workflowNodeId = typeof input.workflowNodeId === "string" ? input.workflowNodeId : "";
    if (workflowRunId || workflowNodeId) {
      if (!uuid.test(workflowRunId) || !uuid.test(workflowNodeId) || existingTaskId) return NextResponse.json({error:"Invalid workflow task identity."},{status:400});
      const response = await fetch(`${supabaseUrl}/rest/v1/company_workflow_runs?select=*&id=eq.${workflowRunId}&company_id=eq.${encodeURIComponent(companyId)}&limit=1`,{headers:user.headers,cache:"no-store"});
      const rows = response.ok ? await response.json() as WorkflowRun[] : [];
      const run = rows[0], node = run ? orderNodes(run.nodes,run.edges)[run.cursor] : undefined;
      if (!run || run.status !== "running" || node?.id !== workflowNodeId || node.type !== "agent" || node.agentId !== agentId) return NextResponse.json({error:"Workflow step is not claimed for this agent."},{status:409});
    }
    if (existingTaskId) {
      const queuedResponse = await fetch(`${supabaseUrl}/rest/v1/company_tasks?select=id,title,objective,task_type,status&company_id=eq.${encodeURIComponent(companyId)}&id=eq.${encodeURIComponent(existingTaskId)}&limit=1`,{headers:user.headers,cache:"no-store"});
      if (!queuedResponse.ok) return NextResponse.json({error:"Queued company task could not be loaded."},{status:502});
      const queuedRows = await queuedResponse.json() as Array<{id:string;title:string;objective:string;task_type:string;status:string}>;
      const queued = queuedRows[0];
      if (!queued) return NextResponse.json({error:"Task not found in this company."},{status:404});
      if (queued.status !== "queued") return NextResponse.json({error:"Only queued tasks can be executed from the work queue."},{status:409});
      title = queued.title;
      objective = queued.objective;
      taskType = queued.task_type;
    }
    if (agentId) {
      const agentResponse = await fetch(`${supabaseUrl}/rest/v1/company_ai_agents?select=id,name,role,instructions,runtime,provider,model,connection_id,status&company_id=eq.${encodeURIComponent(companyId)}&id=eq.${encodeURIComponent(agentId)}&limit=1`,{headers:user.headers,cache:"no-store"});
      if (!agentResponse.ok) return NextResponse.json({error:"The selected AI employee could not be loaded."},{status:502});
      const agentRows = await agentResponse.json() as Array<{id:string;name:string;role:string;instructions:string;runtime:string;provider:string|null;model:string|null;connection_id:string|null;status:string}>;
      const agent = agentRows[0];
      if (!agent || agent.status !== "active" || agent.runtime !== "provider" || !agent.provider || !agent.model || !agent.connection_id) return NextResponse.json({error:"Select an active provider-backed AI employee. Draft and paused employees cannot execute tasks."},{status:400});
      connectionId = agent.connection_id;
      model = agent.model;
      assignedAgentId = agent.id;
      assignedAgentProvider = agent.provider;
      agentContext = `Assigned AI employee: ${agent.name}. Role: ${agent.role}. Employee instructions: ${agent.instructions || "Follow the company mission and task objective."}. Provider: ${agent.provider}. Model: ${agent.model}.`;
    }
    const connectionResponse = await fetch(`${supabaseUrl}/rest/v1/company_ai_connections?select=id,provider,status,credential_ciphertext&company_id=eq.${encodeURIComponent(companyId)}&id=eq.${encodeURIComponent(connectionId)}&limit=1`,{headers:user.headers,cache:"no-store"});
    if (!connectionResponse.ok) return NextResponse.json({error:"AI provider connection could not be loaded."},{status:502});
    const connections = await connectionResponse.json() as Array<{id:string;provider:Provider;status:string;credential_ciphertext:string|null}>;
    const connection = connections[0];
    if (!connection || connection.status !== "connected" || !connection.credential_ciphertext) return NextResponse.json({error:"Select an active API connection for this company."},{status:400});
    if (!["openai", "anthropic", "openrouter"].includes(connection.provider)) return NextResponse.json({error:"This provider is not supported by the task runner."},{status:400});
    if (assignedAgentProvider && connection.provider !== assignedAgentProvider) return NextResponse.json({error:"The selected employee and provider connection do not match."},{status:400});
    let key: string;
    try { key = decryptAiCredential(connection.credential_ciphertext); } catch { return NextResponse.json({error:"AI credentials cannot be decrypted on this deployment. Verify EIDOLON_AI_ENCRYPTION_KEY."},{status:503}); }

    if (existingTaskId) {
      const taskResponse = await fetch(`${supabaseUrl}/rest/v1/company_tasks?id=eq.${encodeURIComponent(existingTaskId)}&company_id=eq.${encodeURIComponent(companyId)}&status=eq.queued`,{method:"PATCH",headers:{...user.headers,Prefer:"return=representation"},body:JSON.stringify({status:"running",assigned_agent_id:assignedAgentId,updated_at:new Date().toISOString()}),cache:"no-store"});
      if (!taskResponse.ok) return NextResponse.json({error:"The queued task could not be claimed, so no model call was made."},{status:502});
      const taskRows = await taskResponse.json() as Array<{id:string}>;
      taskId = taskRows[0]?.id ?? "";
      if (!taskId) return NextResponse.json({error:"This task was already claimed or is no longer queued."},{status:409});
    } else {
      const taskResponse = await fetch(`${supabaseUrl}/rest/v1/company_tasks`,{method:"POST",headers:{...user.headers,Prefer:"return=representation"},body:JSON.stringify({company_id:companyId,created_by:user.id,assigned_agent_id:assignedAgentId,title,objective,task_type:taskType,status:"running",...(workflowRunId?{workflow_run_id:workflowRunId,workflow_node_id:workflowNodeId}:{})}),cache:"no-store"});
      if (!taskResponse.ok) return NextResponse.json({error:"The task could not be recorded, so no model call was made."},{status:502});
      const taskRows = await taskResponse.json() as Array<{id:string}>;
      taskId = taskRows[0]?.id ?? "";
      if (!taskId) return NextResponse.json({error:"Task identity could not be confirmed."},{status:502});
    }

    const prompt = `You are assisting the owner of the operating business "${company.name}".\nIndustry: ${company.industry}.\nMission and services: ${company.mission}\nBusiness model: ${company.business_model}\nTarget customers: ${company.target_customer || "Not specified"}\n\n${agentContext}\n\nTask category: ${taskType}.\nOwner instruction: ${objective}\n\nProduce a useful, specific deliverable for the actual type of business described. For local services and trades, prioritize service area, ideal customer, lead sources, enquiry handling, quote preparation, scheduling, job checklists, customer communication, repeat business, and safety or licensing boundaries where relevant. For wholesale, consider buyer segments, supplier relationships, inventory constraints, order minimums, and repeat purchasing. For digital businesses, tailor recommendations to their product and distribution. Separate assumptions from known facts. Do not invent completed work, customers, revenue, market data, citations, or actions you did not perform. Do not claim to contact leads, book jobs, issue quotes, spend ad budget, or perform physical work unless a connected tool actually did so. Use clear headings and actionable next steps.`;
    let result: string;
    try { result = await runProvider(connection.provider,key,model,prompt); }
    catch (error) {
      const code = error instanceof Error ? error.message : "provider_request_failed";
      const message = code === "provider_auth_rejected" ? "The provider rejected the saved key. Reconnect the provider." : code === "provider_rate_limited" ? "The provider rate limit or quota was reached." : code === "provider_empty_output" ? "The provider returned no readable text." : "The provider request failed. Check model availability and provider status.";
      await fetch(`${supabaseUrl}/rest/v1/company_tasks?id=eq.${encodeURIComponent(taskId)}`,{method:"PATCH",headers:{...user.headers,Prefer:"return=minimal"},body:JSON.stringify({status:"failed",error_code:code,updated_at:new Date().toISOString()}),cache:"no-store"}).catch(()=>null);
      return NextResponse.json({error:message,taskId},{status:code==="provider_auth_rejected"?400:502});
    }

    const artifactType = taskType === "planning" ? "plan" : taskType === "content" || taskType === "marketing" ? "content" : taskType === "research" ? "report" : "document";
    const artifactResponse = await fetch(`${supabaseUrl}/rest/v1/company_artifacts`,{method:"POST",headers:{...user.headers,Prefer:"return=representation"},body:JSON.stringify({company_id:companyId,task_id:taskId,created_by:user.id,artifact_type:artifactType,title,body:result,source_provider:connection.provider}),cache:"no-store"});
    if (!artifactResponse.ok) {
      await fetch(`${supabaseUrl}/rest/v1/company_tasks?id=eq.${encodeURIComponent(taskId)}`,{method:"PATCH",headers:{...user.headers,Prefer:"return=minimal"},body:JSON.stringify({status:"review",result,updated_at:new Date().toISOString()}),cache:"no-store"}).catch(()=>null);
      return NextResponse.json({error:"The model completed the task, but saving the deliverable failed. The result is returned so you can copy it.",result,taskId},{status:502});
    }
    const completion = await fetch(`${supabaseUrl}/rest/v1/company_tasks?id=eq.${encodeURIComponent(taskId)}&company_id=eq.${encodeURIComponent(companyId)}&status=eq.running`,{method:"PATCH",headers:{...user.headers,Prefer:"return=representation"},body:JSON.stringify({status:"completed",result,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}),cache:"no-store"});
    const completed = completion.ok ? await completion.json() as Array<{id:string}> : [];
    if (!completed[0]) return NextResponse.json({error:"Deliverable saved, but task completion was not confirmed. Inspect work history before running again.",taskId,result},{status:502});
    const artifacts = await artifactResponse.json() as Array<{id:string}>;
    return NextResponse.json({task:{id:taskId,status:"completed",assignedAgentId},artifact:artifacts[0]??null,result,provider:connection.provider,model},{status:201});
  } catch {
    if (taskId && user) await fetch(`${supabaseUrl}/rest/v1/company_tasks?id=eq.${encodeURIComponent(taskId)}`,{method:"PATCH",headers:{...user.headers,Prefer:"return=minimal"},body:JSON.stringify({status:"failed",error_code:"internal_failure",updated_at:new Date().toISOString()}),cache:"no-store"}).catch(()=>null);
    return NextResponse.json({error:"Company work service is temporarily unavailable."},{status:503});
  }
}
