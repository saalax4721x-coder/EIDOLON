import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { loadTs } from './load-ts.mjs';
const migration = name => fs.readFile(new URL('../supabase/migrations/' + name, import.meta.url), 'utf8');
test('actual workflow/dashboard migrations enforce PostgreSQL RLS, immutable snapshots, and full counts', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
  for (const name of [
    '20261013120000_digital_companies_ai_workforce.sql',
    '20261013160000_harden_company_membership_rls.sql',
    '20261013170000_fix_company_owner_membership_policy.sql',
    '20261014150000_company_lead_pipeline.sql',
    '20261015010000_company_quotes_jobs.sql',
    '20261015220000_sponsorship_marketplace.sql',
    '20261016204000_company_workflows.sql',
    '20261016204100_workflow_execution_dashboard.sql',
  ]) {
    // gen_random_uuid is built into PostgreSQL. This test needs no pgcrypto-only functions.
    const sql = (await migration(name)).replace('create extension if not exists pgcrypto;', '');
    await db.exec(sql);
  }
  await db.exec('grant select,insert,update,delete on public.companies,public.company_members,public.company_tasks,public.company_ai_agents,public.company_artifacts,public.company_ai_connections to authenticated;');
  const u1 = randomUUID(), u2 = randomUUID(), c1 = randomUUID(), c2 = randomUUID(), w1 = randomUUID(), w2 = randomUUID(), lead = randomUUID();
  await db.query('insert into auth.users values ($1),($2)', [u1,u2]);
  await db.query(`insert into public.companies(id,owner_id,name,slug,mission) values ($1,$2,'Test A','test-a','Local test company A'),($3,$4,'Test B','test-b','Local test company B')`, [c1,u1,c2,u2]);
  await db.query(`insert into public.company_members(company_id,user_id,role) values ($1,$2,'owner'),($3,$4,'owner')`, [c1,u1,c2,u2]);
  const graph = loadTs('lib/workflow.ts').workflowTemplate(); graph.nodes[1].agentId = randomUUID();
  for (const [w,c,u] of [[w1,c1,u1],[w2,c2,u2]]) await db.query(`insert into public.company_workflows(id,company_id,created_by,name,nodes,edges) values ($1,$2,$3,'Test graph',$4,$5)`, [w,c,u,JSON.stringify(graph.nodes),JSON.stringify(graph.edges)]);
  await db.query(`insert into public.company_leads(id,company_id,created_by,name) values($1,$2,$3,'Test lead')`, [lead,c1,u1]);
  await db.query(`insert into public.company_quotes(company_id,created_by,lead_id,title,amount,currency,status) values ($1,$2,$3,'Test USD',10.20,'USD','draft'),($1,$2,$3,'Test EUR',7.10,'EUR','accepted'),($1,$2,$3,'Test USD 2',2.30,'USD','draft')`, [c1,u1,lead]);
  await db.query(`insert into public.company_tasks(company_id,created_by,title,objective,status) select $1,$2,'Test task','Local test objective','queued' from generate_series(1,1501)`, [c1,u1]);
  await db.exec('set role authenticated');
  const asUser = id => db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  await asUser(u1);
  let runId;
  await t.test('owner can save run snapshot; other company identity and creator are denied', async () => {
    const result = await db.query(`insert into public.company_workflow_runs(company_id,workflow_id,created_by,name,nodes,edges) values ($1,$2,$3,'Test graph',$4,$5) returning id`, [c1,w1,u1,JSON.stringify(graph.nodes),JSON.stringify(graph.edges)]);
    runId = result.rows[0].id;
    await assert.rejects(db.query(`insert into public.company_workflow_runs(company_id,workflow_id,created_by,name,nodes,edges) values ($1,$2,$3,'Test graph',$4,$5)`, [c2,w2,u1,JSON.stringify(graph.nodes),JSON.stringify(graph.edges)]));
    await assert.rejects(db.query(`insert into public.company_workflow_runs(company_id,workflow_id,created_by,name,nodes,edges) values ($1,$2,$3,'Test graph',$4,$5)`, [c1,w2,u1,JSON.stringify(graph.nodes),JSON.stringify(graph.edges)]));
  });
  await t.test('second account cannot read, change or delete first account workflows and runs', async () => {
    await asUser(u2);
    assert.equal((await db.query('select * from public.company_workflow_runs where id=$1',[runId])).rows.length,0);
    assert.equal((await db.query("update public.company_workflow_runs set status='running',version=1 where id=$1 returning id",[runId])).rows.length,0);
    assert.equal((await db.query('delete from public.company_workflows where id=$1 returning id',[w1])).rows.length,0);
    await assert.rejects(db.query('select public.company_dashboard($1)',[c1]));
    await asUser(u1);
  });
  await t.test('snapshot cannot be rewritten; compare-and-swap grants only one step claim', async () => {
    await assert.rejects(db.query("update public.company_workflow_runs set name='Changed',version=1,status='running' where id=$1",[runId]));
    assert.equal((await db.query("update public.company_workflow_runs set status='running',version=1 where id=$1 and version=0 returning id",[runId])).rows.length,1);
    assert.equal((await db.query("update public.company_workflow_runs set status='running',version=1 where id=$1 and version=0 returning id",[runId])).rows.length,0);
    const task = `insert into public.company_tasks(company_id,created_by,title,objective,workflow_run_id,workflow_node_id) values($1,$2,'Workflow task','Test objective',$3,$4)`;
    const values = [c1,u1,runId,graph.nodes[1].id];
    await db.query(task, values);
    await assert.rejects(db.query(task, values));
    await db.query("update public.company_workflow_runs set status='completed',version=2 where id=$1",[runId]);
    await assert.rejects(db.query("update public.company_workflow_runs set status='ready',version=3 where id=$1",[runId]));
    await assert.rejects(db.query('delete from public.company_workflows where id=$1',[w1]));
  });
  await t.test('dashboard counts beyond REST page limit, groups statuses and separates currency', async () => {
    const { rows } = await db.query('select public.company_dashboard($1) stats',[c1]); const stats = rows[0].stats;
    assert.equal(stats.counts.tasks,1502); assert.equal(stats.statuses.tasks.queued,1502);
    assert.equal(stats.counts.runs,1); assert.equal(stats.counts.quotes,3); assert.equal(stats.counts.agents,0);
    assert.equal(stats.ownedCompanies,1);
    assert.deepEqual(stats.quotedAmounts,[{ currency:'EUR',status:'accepted',count:1,amount:'7.10' },{ currency:'USD',status:'draft',count:2,amount:'12.50' }]);
  });
  await t.test('anonymous role cannot read runs or invoke dashboard', async () => {
    await db.exec('reset role; set role anon');
    await assert.rejects(db.query('select * from public.company_workflow_runs'));
    await assert.rejects(db.query('select public.company_dashboard($1)',[c1]));
    await db.exec('reset role');
  });
});
