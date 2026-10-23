import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './load-ts.mjs';
const catalog=loadTs('lib/marketplace.ts');
const route=loadTs('app/api/marketplace/route.ts',{'@/lib/marketplace':catalog,'next/server':{NextResponse:Response}});
test('directory search intersects type, geography and all query words',()=>{
  assert.deepEqual(Array.from(catalog.searchMarketplace(catalog.marketProfiles,'developer email','Startup','all'),p=>p.id),['resend']);
  assert.deepEqual(Array.from(catalog.searchMarketplace(catalog.marketProfiles,'growth','Private equity','Global'),p=>p.id),['kkr']);
  assert.equal(catalog.searchMarketplace(catalog.marketProfiles,'developer','Private equity','all').length,0);
  assert.equal(catalog.searchMarketplace(catalog.marketProfiles,'  ','all','all').length,catalog.marketProfiles.length);
});
test('public profiles carry dated sources, with no fabricated membership or fundraising status',()=>{
  assert.equal(new Set(catalog.marketProfiles.map(p=>p.id)).size,catalog.marketProfiles.length);
  for(const profile of catalog.marketProfiles){
    assert.equal(new URL(profile.source).protocol,'https:');assert.equal(new URL(profile.website).protocol,'https:');
    assert.match(profile.reviewedOn,/^\d{4}-\d{2}-\d{2}$/);assert.ok(profile.sourceLabel);
    assert.equal(profile.memberId,undefined);assert.equal(profile.sponsorId,undefined);
    if(profile.kind==='Startup')assert.match(profile.opportunity,/fundraising availability is not confirmed/i);
  }
});
test('directory API rejects unknown filters and does not retrieve arbitrary user-supplied URLs',async()=>{
  for(const query of ['kind=unknown','geography=https://127.0.0.1'])assert.equal((await route.GET(new Request('https://app.test/api/marketplace?'+query))).status,400);
  const response=await route.GET(new Request('https://app.test/api/marketplace?kind=Private%20equity&q=growth'));
  assert.equal(response.status,200);const body=await response.json();assert.deepEqual(body.profiles.map(p=>p.id),['kkr']);assert.ok(body.kinds.includes('Startup'));assert.match(body.collection,/Reviewed public-source/);
});
test('saved research retains provenance, leaves contact blank and does not invent interest',()=>{
  const profile=catalog.marketProfiles.find(profile=>profile.id==='kkr');
  const lead=catalog.marketplaceLeadInput(profile,'owned-company');
  assert.equal(lead.companyId,'owned-company');assert.equal(lead.source,'public_directory');assert.equal(lead.contact,'');
  assert.ok(lead.notes.includes(profile.source));assert.ok(lead.notes.includes(profile.reviewedOn));assert.match(lead.notes,/No contact or investment interest confirmed/);assert.match(lead.nextAction,/before any contact/);
});
