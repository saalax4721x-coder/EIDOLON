import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadTs } from './load-ts.mjs';
const workflowModule = loadTs('lib/workflow.ts');
const companyId = randomUUID(), userId = randomUUID(), workflowId = randomUUID(), runId = randomUUID();
function harness({ authenticated = true, owned = true, providerFails = false, lostClaim = false } = {}) {
  const graph = workflowModule.workflowTemplate(); graph.nodes[1].agentId = randomUUID();
  const workflow = { ...graph, id: workflowId, name: 'Test workflow', status: 'draft' };
  let run, calls = 0, dataCalls = 0;
  const api = loadTs('app/api/company/workflows/runs/route.ts', {
    'next/server': { NextResponse: Response }, '@/lib/workflow': workflowModule,
    '@/lib/company-api': {
      companySession: async () => authenticated ? { id: userId } : null, companyOwned: async () => owned,
      companyData: async (_user, path, method = 'GET', body) => {
        dataCalls++;
        if (path.startsWith('company_workflows?')) return [workflow];
        if (path.startsWith('company_ai_agents?')) return [{ id: graph.nodes[1].agentId, runtime: 'provider', status: 'active' }];
        if (path === 'company_workflow_runs' && method === 'POST') { run = { ...body, id: runId, status: 'ready', cursor: 0, steps: [], version: 0, updated_at: new Date().toISOString() }; return [structuredClone(run)]; }
        if (path.startsWith('company_workflow_runs?') && method === 'GET') return run ? [structuredClone(run)] : [];
        if (method === 'PATCH') {
          if (!path.includes(`version=eq.${run.version}`) || (lostClaim && body.status === 'running')) return [];
          run = { ...run, ...body }; return [structuredClone(run)];
        }
        throw Error('Unexpected DB path ' + path);
      },
    },
    '@/app/api/company/generate/route': { POST: async req => {
      const input = await req.json(); assert.equal(input.companyId, companyId); assert.equal(input.agentId, graph.nodes[1].agentId); assert.equal(input.workflowRunId,runId); assert.equal(input.workflowNodeId,graph.nodes[1].id); calls++;
      return Response.json(providerFails ? { error: 'provider_rate_limited', taskId: randomUUID() } : { task: { id: randomUUID(), status: 'completed' }, result: 'Actual mocked boundary output' }, { status: providerFails ? 502 : 201 });
    } },
  });
  const post = body => api.POST(new Request('https://example.test/api/company/workflows/runs', { method: 'POST', body: JSON.stringify({ companyId, runId, ...body }) }));
  return { post, api, graph, workflow, get run() { return run; }, get calls() { return calls; }, get dataCalls() { return dataCalls; } };
}
test('authentication and ownership are enforced before reading run data', async () => {
  for (const [options, expected] of [[{ authenticated: false }, 401], [{ owned: false }, 404]]) { const h = harness(options); assert.equal((await h.post({ action: 'start' })).status, expected); assert.equal(h.dataCalls, 0); }
});
test('start requires explicit provider authorization and validates graph', async () => {
  const h = harness(); assert.equal((await h.post({ action: 'start', workflowId })).status, 400);
  h.graph.nodes[1].agentId = undefined;
  assert.equal((await h.post({ action: 'start', workflowId, confirmProviderCharges: true })).status, 400); assert.equal(h.calls, 0);
});
test('real runner boundary, durable steps and human approval gate complete a workflow', async () => {
  const h = harness(); assert.equal((await h.post({ action: 'start', workflowId, confirmProviderCharges: true })).status, 201);
  await h.post({ action: 'advance' }); assert.equal(h.run.cursor, 1); assert.equal(h.calls, 0);
  await h.post({ action: 'advance' }); assert.equal(h.calls, 1); assert.ok(h.run.steps[1].taskId);
  await h.post({ action: 'advance' }); assert.equal(h.run.status, 'review');
  assert.equal((await h.post({ action: 'advance' })).status, 409); assert.equal(h.calls, 1);
  await h.post({ action: 'approve' }); assert.equal(h.run.steps[2].status, 'approved');
  await h.post({ action: 'advance' }); assert.equal(h.run.status, 'completed');
  assert.equal((await h.post({ action: 'advance' })).status, 409);
});
test('failed provider step is terminal and records the task identity', async () => {
  const h = harness({ providerFails: true }); await h.post({ action: 'start', workflowId, confirmProviderCharges: true }); await h.post({ action: 'advance' }); await h.post({ action: 'advance' });
  assert.equal(h.run.status, 'failed'); assert.ok(h.run.steps[1].taskId); assert.equal(h.run.steps[1].status, 'failed');
  assert.equal((await h.post({ action: 'advance' })).status, 409); assert.equal(h.calls, 1);
});
test('lost concurrent claim never calls provider; cancellation blocks further actions', async () => {
  const h = harness({ lostClaim: true }); await h.post({ action: 'start', workflowId, confirmProviderCharges: true });
  assert.equal((await h.post({ action: 'advance' })).status, 409); assert.equal(h.calls, 0);
  await h.post({ action: 'cancel' }); assert.equal(h.run.status, 'cancelled'); assert.equal((await h.post({ action: 'advance' })).status, 409);
});
test('invalid JSON and missing run return clear errors', async () => {
  const h = harness(); assert.equal((await h.api.POST(new Request('https://example.test', { method: 'POST', body: '{' }))).status, 400);
  assert.equal((await h.post({ action: 'advance' })).status, 404);
});
