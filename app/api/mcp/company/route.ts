import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonRpcRequest = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
const protocolVersion = "2025-03-26";
const tools = [
  {
    name: "get_company_overview",
    description: "Read the authorized EIDOLON company's identity, mission, business model, target customer and status.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_company_artifacts",
    description: "Read up to 25 recent deliverables saved in the authorized EIDOLON company archive.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "create_company_task",
    description: "Queue a company task for EIDOLON workforce execution. Queued does not mean completed.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 2, maxLength: 180 },
        objective: { type: "string", minLength: 5, maxLength: 12000 },
        task_type: { type: "string", enum: ["planning", "research", "content", "marketing", "product", "coding", "operations", "general"] },
      },
      required: ["title", "objective"],
      additionalProperties: false,
    },
  },
  {
    name: "save_company_artifact",
    description: "Save content, a plan, research report, code, or another deliverable generated in ChatGPT/Claude into the company's EIDOLON archive.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 2, maxLength: 180 },
        body: { type: "string", minLength: 1, maxLength: 100000 },
        artifact_type: { type: "string", enum: ["plan", "document", "content", "report", "code", "other"] },
      },
      required: ["title", "body"],
      additionalProperties: false,
    },
  },
];

async function execute(tokenHash: string, tool: string, args: Record<string, unknown> = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_company_mcp_tool`, {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify({ p_token_hash: tokenHash, p_tool: tool, p_arguments: args }),
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("unauthorized");
    if (response.status === 400) throw new Error("invalid_request");
    throw new Error("tool_execution_failed");
  }
  return await response.json() as unknown;
}

function rpc(id: JsonRpcRequest["id"], result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result }, {
    headers: { "Cache-Control": "no-store", "MCP-Protocol-Version": protocolVersion },
  });
}
function rpcError(id: JsonRpcRequest["id"], code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, {
    status: 200,
    headers: { "Cache-Control": "no-store", "MCP-Protocol-Version": protocolVersion },
  });
}

export async function GET() {
  return NextResponse.json({
    name: "EIDOLON Company MCP",
    protocol: protocolVersion,
    transport: "Streamable HTTP",
    instructions: "Send JSON-RPC requests with Authorization: Bearer <company MCP token>.",
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(eid_mcp_[A-Za-z0-9_-]{40,})$/)?.[1];
  if (!token) return NextResponse.json({ error: "A company-scoped EIDOLON MCP bearer token is required." }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });

  const tokenHash = createHash("sha256").update(token).digest("hex");
  try {
    await execute(tokenHash, "auth_check");
  } catch {
    return NextResponse.json({ error: "The EIDOLON MCP token is invalid or revoked." }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  }

  let message: JsonRpcRequest;
  try { message = await request.json() as JsonRpcRequest; }
  catch { return rpcError(null, -32700, "Parse error"); }
  if (message.jsonrpc !== "2.0" || typeof message.method !== "string") return rpcError(message.id, -32600, "Invalid Request");
  if (message.method === "notifications/initialized" || message.method === "notifications/cancelled") return new NextResponse(null, { status: 202 });
  if (message.method === "initialize") {
    return rpc(message.id, {
      protocolVersion,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "eidolon-company", version: "1.0.0" },
      instructions: "EIDOLON exposes only the company selected when this scoped token was created. Use get_company_overview before creating tasks or saving artifacts. Never claim queued tasks are complete.",
    });
  }
  if (message.method === "ping") return rpc(message.id, {});
  if (message.method === "tools/list") return rpc(message.id, { tools });
  if (message.method === "tools/call") {
    const params = message.params ?? {};
    const name = typeof params.name === "string" ? params.name : "";
    const args = params.arguments && typeof params.arguments === "object" && !Array.isArray(params.arguments) ? params.arguments as Record<string, unknown> : {};
    if (!tools.some((tool) => tool.name === name)) return rpc(message.id, { content: [{ type: "text", text: "Unknown EIDOLON company tool." }], isError: true });
    try {
      const result = await execute(tokenHash, name, args);
      return rpc(message.id, { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result, isError: false });
    } catch (error) {
      const messageText = error instanceof Error && error.message === "invalid_request" ? "Invalid tool arguments." : error instanceof Error && error.message === "unauthorized" ? "The token does not have permission for this operation." : "The company tool could not complete. No success is implied.";
      return rpc(message.id, { content: [{ type: "text", text: messageText }], isError: true });
    }
  }
  return rpcError(message.id, -32601, "Method not found");
}
