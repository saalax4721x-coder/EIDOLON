import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './load-ts.mjs';
class AuthResponse extends Response {
 cookieValues=new Map();cookies={set:(name,value,options)=>this.cookieValues.set(name,{value,options})};
 static json(body,init={}){return new AuthResponse(JSON.stringify(body),init)}
}
const config={supabaseUrl:'https://auth.test',supabasePublishableKey:'public-fixture',supabaseHeaders:{apikey:'public-fixture'}};
function route(path,values,fetch){return loadTs(path,{'next/server':{NextResponse:AuthResponse},'next/headers':{cookies:async()=>({get:name=>values[name]?{value:values[name]}:undefined})},'@/lib/supabase-config':config},{fetch})}
test('transient refresh failures never clear session cookies or falsely report expiry',async()=>{
 for(const fetch of [async()=>Response.json({}, {status:500}),async()=>Response.json({}, {status:429}),async()=>{throw Error('offline')}]){
  const r=await route('app/api/auth/refresh/route.ts',{eidolon_refresh_token:'fixture'},fetch).POST();assert.equal(r.status,503);assert.equal(r.cookieValues.size,0);
 }
});
test('only rejected refresh credentials clear protected session cookies',async()=>{
 const r=await route('app/api/auth/refresh/route.ts',{eidolon_refresh_token:'fixture'},async()=>Response.json({}, {status:400})).POST();
 assert.equal(r.status,401);assert.equal(r.cookieValues.get('eidolon_access_token').options.maxAge,0);assert.equal(r.cookieValues.get('eidolon_refresh_token').options.maxAge,0);
});
test('session inspection preserves credentials during user-service or refresh outages',async()=>{
 for(const fetch of [async()=>Response.json({}, {status:503}),async url=>url.includes('/user')?Response.json({}, {status:401}):Response.json({}, {status:500}),async url=>url.includes('/user')?Response.json({}, {status:401}):Response.json({access_token:'incomplete'})]){
  const r=await route('app/api/auth/session/route.ts',{eidolon_access_token:'fixture-access',eidolon_refresh_token:'fixture-refresh'},fetch).GET();assert.equal(r.status,503);assert.equal(r.cookieValues.size,0);
 }
});
test('an expired access token recovers with a valid rotated session',async()=>{
 let users=0;
 const r=await route('app/api/auth/session/route.ts',{eidolon_access_token:'expired',eidolon_refresh_token:'fixture-refresh'},async url=>url.includes('/user')?(++users===1?Response.json({}, {status:401}):Response.json({id:'real-owner',email:'fixture@example.test'})):Response.json({access_token:'rotated-access',refresh_token:'rotated-refresh',expires_in:1800})).GET();
 assert.equal(r.status,200);assert.equal((await r.json()).authenticated,true);assert.equal(r.cookieValues.get('eidolon_refresh_token').value,'rotated-refresh');assert.equal(r.cookieValues.get('eidolon_access_token').options.httpOnly,true);
});
