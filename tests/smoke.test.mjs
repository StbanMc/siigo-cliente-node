// Smoke test — verifies wiring with a fully mocked fetch.
// Run: node --test tests/smoke.test.mjs

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createClient, SiigoAuthError } from '../src/index.js';

function makeMockFetch(responses) {
  let i = 0;
  const calls = [];
  async function mockFetch(url, init) {
    calls.push({ url, init });
    const next = responses[i] ?? responses[responses.length - 1];
    i += 1;
    if (next.throw) throw next.throw;
    return {
      status: next.status ?? 200,
      headers: {
        get(name) {
          const map = next.headers || {};
          return map[name.toLowerCase()] ?? map[name] ?? null;
        },
      },
      text: async () =>
        next.body === undefined ? '' : typeof next.body === 'string' ? next.body : JSON.stringify(next.body),
    };
  }
  mockFetch.calls = calls;
  return mockFetch;
}

describe('createClient — smoke', () => {
  it('rejects when credentials are missing', () => {
    assert.throws(() => createClient({}), /username/);
    assert.throws(() => createClient({ username: 'a' }), /accessKey/);
  });

  it('exposes api + tokens + http surface', () => {
    const client = createClient({
      username: 'u@example.com',
      accessKey: 'k',
      fetch: makeMockFetch([]),
    });
    assert.equal(typeof client.api.get, 'function');
    assert.equal(typeof client.api.post, 'function');
    assert.equal(typeof client.api.paginate, 'function');
    assert.equal(typeof client.tokens.getToken, 'function');
    assert.equal(client.baseUrl, 'https://api.siigo.com/v1');
    assert.equal(client.authUrl, 'https://api.siigo.com/auth');
  });

  it('roundtrips auth → GET with bearer token and Partner-Id', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok-123', expires_in: 3600 }, headers: { 'content-type': 'application/json' } },
      { status: 200, body: { id: 42, name: 'ACME' }, headers: { 'content-type': 'application/json' } },
    ]);
    const client = createClient({
      username: 'u@example.com',
      accessKey: 'secret-key',
      fetch: fetchMock,
      sleep: async () => {},
    });

    const out = await client.api.get('/customers/42');
    assert.deepEqual(out, { id: 42, name: 'ACME' });

    assert.equal(fetchMock.calls.length, 2);
    assert.equal(fetchMock.calls[0].url, 'https://api.siigo.com/auth');
    assert.equal(fetchMock.calls[0].init.method, 'POST');
    const authBody = JSON.parse(fetchMock.calls[0].init.body);
    assert.deepEqual(authBody, { username: 'u@example.com', access_key: 'secret-key' });

    assert.equal(fetchMock.calls[1].url, 'https://api.siigo.com/v1/customers/42');
    assert.equal(fetchMock.calls[1].init.headers.Authorization, 'Bearer tok-123');
    assert.equal(fetchMock.calls[1].init.headers['Partner-Id'], 'siigo-cliente-node');
  });

  it('retries 503 with exponential backoff and Retry-After', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      { status: 503, headers: { 'retry-after': '1' }, body: 'try later' },
      { status: 200, body: { ok: true } },
    ]);
    let sleeps = [];
    const client = createClient({
      username: 'u@example.com',
      accessKey: 'k',
      fetch: fetchMock,
      sleep: async ms => { sleeps.push(ms); },
      baseDelayMs: 10,
    });

    const out = await client.api.get('/customers');
    assert.deepEqual(out, { ok: true });
    assert.equal(fetchMock.calls.length, 3);
    assert.equal(sleeps[0], 1000, 'Retry-After: 1 should translate to 1000ms');
  });

  it('caches token across calls and refreshes after invalidate', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok-1', expires_in: 3600 } },
      { status: 200, body: { ok: 1 } },
      { status: 200, body: { ok: 2 } },
      { status: 200, body: { access_token: 'tok-2', expires_in: 3600 } },
      { status: 200, body: { ok: 3 } },
    ]);
    const client = createClient({
      username: 'u@example.com',
      accessKey: 'k',
      fetch: fetchMock,
      sleep: async () => {},
    });

    await client.api.get('/a');
    await client.api.get('/b');
    client.tokens.invalidate();
    await client.api.get('/c');

    assert.equal(fetchMock.calls.length, 5);
    assert.equal(fetchMock.calls[1].init.headers.Authorization, 'Bearer tok-1');
    assert.equal(fetchMock.calls[2].init.headers.Authorization, 'Bearer tok-1');
    assert.equal(fetchMock.calls[4].init.headers.Authorization, 'Bearer tok-2');
  });

  it('surfaces auth failure as SiigoAuthError', async () => {
    const fetchMock = makeMockFetch([
      { status: 401, body: { Message: 'Invalid credentials' } },
    ]);
    const client = createClient({
      username: 'u@example.com',
      accessKey: 'wrong',
      fetch: fetchMock,
      sleep: async () => {},
    });
    await assert.rejects(client.api.get('/customers'), err => {
      assert.ok(err instanceof SiigoAuthError, 'should be SiigoAuthError');
      return true;
    });
  });
});
