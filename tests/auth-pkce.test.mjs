import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { loadTs } from './load-ts.mjs';
const redirect = loadTs('lib/auth-redirect.ts');
class TestResponse extends Response {
  cookieValues = new Map();
  cookies = {
    set: (name, value, options) => this.cookieValues.set(name, { value, options }),
    delete: name => this.cookieValues.set(name, { value: '', options: { maxAge: 0 } }),
  };
  static json(body, init = {}) { return new TestResponse(JSON.stringify(body), { ...init, headers: { 'content-type': 'application/json' } }); }
  static redirect(url) { return new TestResponse(null, { status: 307, headers: { location: String(url) } }); }
}
const config = { supabaseUrl: 'https://db.test', supabasePublishableKey: 'test-public-key' };
function requestRoute(fetch) {
  return loadTs('app/api/auth/request-link/route.ts', { 'next/server': { NextResponse: TestResponse }, '@/lib/supabase-config': config, '@/lib/auth-redirect': redirect }, { fetch });
}
function callbackRoute(values, fetch) {
  return loadTs('app/api/auth/callback/route.ts', { 'next/server': { NextResponse: TestResponse }, 'next/headers': { cookies: async () => ({ get: name => values[name] === undefined ? undefined : { value: values[name] } }) }, '@/lib/supabase-config': config, '@/lib/auth-redirect': redirect }, { fetch });
}
const request = body => new Request('https://app.test/api/auth/request-link', { method: 'POST', body: JSON.stringify(body) });
test('magic-link request uses raw Auth PKCE schema and challenge matches the saved verifier', async () => {
  let sent;
  const route = requestRoute(async (url, options) => { sent = { url, options, body: JSON.parse(options.body) }; return Response.json({}); });
  const response = await route.POST(request({ email: ' Founder@Example.test ', next: '/workflows?companyId=real' }));
  assert.equal(response.status, 200);
  assert.equal(new URL(sent.url).searchParams.get('redirect_to'), 'https://app.test/api/auth/callback');
  assert.equal(sent.body.email, 'founder@example.test'); assert.equal(sent.body.options, undefined);
  assert.equal(sent.body.code_challenge_method, 's256');
  const cookie = response.cookieValues.get('eidolon_pkce_verifier');
  assert.equal(sent.body.code_challenge, createHash('sha256').update(cookie.value).digest('base64url'));
  assert.equal(cookie.options.httpOnly, true); assert.equal(cookie.options.sameSite, 'lax');
  assert.equal(response.cookieValues.get('eidolon_auth_next').value, '/workflows?companyId=real');
  assert.equal(sent.options.cache, 'no-store');
});
test('malformed email and JSON never call Supabase; unsafe redirects fall back locally', async () => {
  let calls = 0;
  const route = requestRoute(async () => { calls++; return Response.json({}); });
  for (const email of ['bad', 'a@', 'a@b', 'x y@example.test', 'x'.repeat(321)]) assert.equal((await route.POST(request({ email }))).status, 400);
  assert.equal((await route.POST(new Request('https://app.test/api/auth/request-link', { method: 'POST', body: '{' }))).status, 400);
  assert.equal(calls, 0);
  for (const value of ['//outside.test', '/\\outside.test', '/path\nheader', 'https://outside.test']) assert.equal(redirect.safeAuthNext(value), '/workspace');
  assert.equal(redirect.safeAuthNext('/dashboard?q=50%'), '/dashboard?q=50%');
});
test('provider rejection, rate limit and network errors are actionable without leaking upstream details', async () => {
  for (const status of [400, 429, 500]) {
    const route = requestRoute(async () => new Response('private upstream details', { status }));
    const response = await route.POST(request({ email: 'founder@example.test' }));
    assert.equal(response.status, status === 429 ? 429 : 502); assert.equal(response.cookieValues.size, 0);
    assert.doesNotMatch((await response.json()).error, /private upstream details/);
  }
  const route = requestRoute(async () => { throw Error('offline'); });
  assert.equal((await route.POST(request({ email: 'founder@example.test' }))).status, 503);
});
test('callback exchanges the matching verifier, writes HttpOnly session cookies and preserves safe destination', async () => {
  const verifier = 'a'.repeat(43); let sent;
  const route = callbackRoute({ eidolon_pkce_verifier: verifier, eidolon_auth_next: '/dashboard?q=50%' }, async (url, options) => {
    sent = { url, body: JSON.parse(options.body) };
    return Response.json({ access_token: 'test-access', refresh_token: 'test-refresh', expires_in: 3600 });
  });
  const response = await route.GET(new Request('https://app.test/api/auth/callback?code=auth-code'));
  assert.equal(sent.body.code_verifier, verifier); assert.equal(sent.body.auth_code, 'auth-code');
  assert.equal(new URL(sent.url).searchParams.get('grant_type'), 'pkce');
  assert.equal(new URL(response.headers.get('location')).pathname, '/dashboard');
  assert.equal(response.cookieValues.get('eidolon_access_token').options.httpOnly, true);
  assert.equal(response.cookieValues.get('eidolon_refresh_token').value, 'test-refresh');
  assert.equal(response.cookieValues.get('eidolon_pkce_verifier').options.maxAge, 0);
});
test('missing or malformed verifier and missing code redirect to a useful auth error without exchange', async () => {
  let calls = 0;
  for (const verifier of [undefined, '%bad', 'short']) {
    const route = callbackRoute({ eidolon_pkce_verifier: verifier, eidolon_auth_next: '//outside.test' }, async () => { calls++; });
    const response = await route.GET(new Request('https://app.test/api/auth/callback?code=code'));
    const destination = new URL(response.headers.get('location'));
    assert.equal(destination.origin, 'https://app.test'); assert.equal(destination.pathname, '/auth'); assert.equal(destination.searchParams.get('next'), '/workspace');
    assert.equal(destination.searchParams.get('error'), 'invalid_link'); assert.equal(response.cookieValues.has('eidolon_access_token'), false);
  }
  const route = callbackRoute({ eidolon_pkce_verifier: 'a'.repeat(43) }, async () => { calls++; });
  await route.GET(new Request('https://app.test/api/auth/callback'));
  assert.equal(calls, 0);
});
test('expired code, invalid session JSON and exchange outages never install session cookies', async () => {
  for (const fetch of [async () => Response.json({}, { status: 400 }), async () => Response.json({ access_token: 'only-one-token' }), async () => new Response('invalid json'), async () => { throw Error('offline'); }]) {
    const route = callbackRoute({ eidolon_pkce_verifier: 'a'.repeat(43), eidolon_auth_next: '/workflows' }, fetch);
    const response = await route.GET(new Request('https://app.test/api/auth/callback?code=code'));
    assert.equal(new URL(response.headers.get('location')).pathname, '/auth');
    assert.equal(response.cookieValues.has('eidolon_access_token'), false);
    assert.equal(response.cookieValues.get('eidolon_pkce_verifier').options.maxAge, 0);
  }
});
