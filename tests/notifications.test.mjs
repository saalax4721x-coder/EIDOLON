import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './load-ts.mjs';
const {companyNotices}=loadTs('lib/notifications.ts');
test('activity highlights actionable and completed records, excludes pending/cancelled work, newest first',()=>{
 const items=companyNotices('owned',[
  {id:'t1',title:'Failed task',status:'failed',updated_at:'2026-10-20T10:00:00Z'},
  {id:'t2',title:'Queued task',status:'queued',updated_at:'2026-10-22T10:00:00Z'},
 ],[
  {id:'r1',name:'Needs review',status:'review',updated_at:'2026-10-21T10:00:00Z'},
  {id:'r2',name:'Cancelled',status:'cancelled',updated_at:'2026-10-22T10:00:00Z'},
  {id:'r3',name:'Finished',status:'completed',updated_at:'2026-10-19T10:00:00Z'},
 ]);
 assert.equal(items.length,3);assert.equal(items[0].kind,'review');assert.equal(items[1].kind,'attention');assert.equal(items[2].kind,'complete');assert.equal(new Set(items.map(i=>i.id)).size,3);
});
test('activity never invents empty events and preserves company isolation in encoded navigation',()=>{
 assert.equal(companyNotices('owned',[],[]).length,0);
 const [item]=companyNotices('a&companyId=other',[],[{id:'r',name:'Ready',status:'ready',updated_at:'2026-10-22T10:00:00Z'}]);
 assert.equal(new URL(item.href,'https://app.test').searchParams.get('companyId'),'a&companyId=other');assert.equal(item.kind,'continue');
});
