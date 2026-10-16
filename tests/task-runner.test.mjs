import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';
const workflowModule = loadTs('lib/workflow.ts');
function runner({ provider = 'openai', completionFails = false, paused = false } = {}) {
  const requests = [];
  const route = loadTs('app/api/company/generate/route.ts', {
    'next/server': { NextResponse: Response }, 'next/headers': { cookies: async () => ({ get: () => ({ value: 'test-session' }) }) },
    '@/lib/ai-credentials': { decryptAiCredential: () => 'test-key' },
    '@/lib/workflow': workflowModule,
    '@/lib/supabase-config': { supabaseUrl: 'https://db.test', supabaseHeaders: { 'Content-Type': 'application/json' } },
  }, { fetch: async (url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : null; requests.push({ url, body, method: options.method });
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'owner' });
    if (url.includes('/companies?')) return Response.json([{ id: 'company', name: 'Test company' }]);
    if (url.includes('/company_ai_agents?')) return Response.json([{ id: 'agent', name: 'Test agent', status: paused ? 'paused' : 'active', runtime: 'provider', provider, model: 'test-model', connection_id: 'connection' }]);
    if (url.includes('/company_ai_connections?')) return Response.json([{ id: 'connection', provider, status: 'connected', credential_ciphertext: 'ciphertext' }]);
    if (url.endsWith('/company_tasks')) return Response.json([{ id: 'task' }]);
    if (url.startsWith('https://api.openai.com/')) return Response.json({ output_text: 'Provider result' });
    if (url.endsWith('/company_artifacts')) return Response.json([{ id: 'artifact' }]);
    if (url.includes('/company_tasks?')) return completionFails ? Response.json({ error: 'database failure' }, { status: 500 }) : Response.json([{ id: 'task' }]);
    throw Error('Unexpected request: ' + url);
  } });
  return { requests, post: () => route.POST(new Request('https://app.test/api/company/generate', { method: 'POST', body: JSON.stringify({ companyId: 'company', agentId: 'agent', title: 'Test action', prompt: 'Test objective' }) })) };
}
test('assigned agent supplies its own provider connection and model', async () => {
  const h = runner(), response = await h.post(); assert.equal(response.status, 201);
  assert.equal((await response.json()).task.status, 'completed');
  assert.ok(h.requests.some(r => r.url === 'https://api.openai.com/v1/responses' && r.body.model === 'test-model'));
});
test('unconfirmed database completion never reports success after a paid call', async () => {
  const h = runner({ completionFails: true }), response = await h.post(), data = await response.json();
  assert.equal(response.status, 502); assert.equal(data.taskId, 'task'); assert.equal(data.result, 'Provider result'); assert.equal(data.task, undefined);
});
test('unsupported providers and paused agents make no paid calls', async () => {
  for (const options of [{ provider: 'google' }, { paused: true }]) {
    const h = runner(options); assert.equal((await h.post()).status, 400); assert.ok(!h.requests.some(r => r.url.startsWith('https://api.openai.com/')));
  }
});
