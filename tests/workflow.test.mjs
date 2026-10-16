import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadTs } from './load-ts.mjs';
const { validateGraph, orderNodes, ancestorResults, workflowTemplate } = loadTs('lib/workflow.ts');
const graph = () => { const g = workflowTemplate(); g.nodes[1].agentId = randomUUID(); return g; };
test('template is incomplete until agent is assigned, then executable', () => {
  const g = workflowTemplate(); assert.ok(validateGraph(g.nodes, g.edges, true).length);
  g.nodes[1].agentId = randomUUID(); assert.equal(validateGraph(g.nodes, g.edges, true).length, 0);
});
test('drafts accept incomplete graphs, executable graphs require entry, exit and action', () => {
  assert.equal(validateGraph([], []).length, 0); assert.ok(validateGraph([], [], true).length);
});
test('cycles, duplicate edges, dangling references and malformed input fail', () => {
  const g = graph();
  for (const extra of [{ id: randomUUID(), source: g.nodes[3].id, target: g.nodes[0].id }, { ...g.edges[0], id: randomUUID() }, { id: randomUUID(), source: randomUUID(), target: g.nodes[0].id }]) assert.ok(validateGraph(g.nodes, [...g.edges, extra]).length);
  for (const input of [null, {}, [null], [{ id: 1 }]]) assert.ok(validateGraph(input, []).length);
});
test('disconnected components, multiple starts, unassigned agents and excessive prompts fail execution', () => {
  const g = graph(); assert.ok(validateGraph(g.nodes, g.edges.slice(1), true).length);
  assert.ok(validateGraph([...g.nodes, { ...g.nodes[0], id: randomUUID() }], g.edges, true).length);
  g.nodes[1].prompt = 'x'.repeat(8001); assert.ok(validateGraph(g.nodes, g.edges).length);
});
test('topological order respects all parents at a join; context excludes unrelated branch outputs', () => {
  const g = graph(), branch = { ...g.nodes[1], id: randomUUID(), label: 'Parallel' };
  g.nodes.push(branch); g.edges.push({ id: randomUUID(), source: g.nodes[0].id, target: branch.id }, { id: randomUUID(), source: branch.id, target: g.nodes[2].id });
  assert.equal(validateGraph(g.nodes, g.edges, true).length, 0);
  const ordered = orderNodes(g.nodes, g.edges); assert.ok(ordered.indexOf(branch) < ordered.indexOf(g.nodes[2]));
  const steps = [{ nodeId: g.nodes[1].id, label: 'A', result: 'first' }, { nodeId: branch.id, label: 'B', result: 'unrelated' }];
  assert.equal(ancestorResults(branch.id, g.edges, steps), '');
  assert.match(ancestorResults(g.nodes[2].id, g.edges, steps), /first/);
  assert.match(ancestorResults(g.nodes[2].id, g.edges, steps), /unrelated/);
});
