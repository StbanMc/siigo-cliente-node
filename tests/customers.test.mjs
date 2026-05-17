// Tests for client.customers — fully mocked fetch.
// Run: node --test tests/customers.test.mjs

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSiigoClientWithResources, makeMockFetch } from './_helpers.mjs';
import { SiigoConfigError, SiigoValidationError } from '../src/index.js';

describe('client.customers', () => {
  it('list() walks pagination and returns a flat array', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      { status: 200, body: { results: [{ id: 1 }, { id: 2 }], pagination: { total_results: 3 } } },
      { status: 200, body: { results: [{ id: 3 }], pagination: { total_results: 3 } } },
    ]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    const out = await client.customers.list({ active: true });
    assert.deepEqual(
      out.map(c => c.id),
      [1, 2, 3]
    );
    assert.equal(fetchMock.calls.length, 3);
    const firstListUrl = new URL(fetchMock.calls[1].url);
    assert.equal(firstListUrl.pathname, '/v1/customers');
    assert.equal(firstListUrl.searchParams.get('active'), 'true');
    assert.equal(firstListUrl.searchParams.get('page'), '1');
  });

  it('paginate() yields items lazily', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      { status: 200, body: { results: [{ id: 1 }, { id: 2 }], pagination: { total_results: 4 } } },
      { status: 200, body: { results: [{ id: 3 }, { id: 4 }], pagination: { total_results: 4 } } },
    ]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    const ids = [];
    for await (const c of client.customers.paginate()) ids.push(c.id);
    assert.deepEqual(ids, [1, 2, 3, 4]);
  });

  it('getById() URL-encodes the id segment', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      { status: 200, body: { id: 'abc/123', name: 'ACME' } },
    ]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    const out = await client.customers.getById('abc/123');
    assert.equal(out.name, 'ACME');
    assert.equal(fetchMock.calls[1].url, 'https://api.siigo.com/v1/customers/abc%2F123');
  });

  it('getById() refuses null/empty id', async () => {
    const fetchMock = makeMockFetch([{ status: 200, body: { access_token: 'tok', expires_in: 3600 } }]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    assert.throws(() => client.customers.getById(null), SiigoConfigError);
    assert.throws(() => client.customers.getById(''), SiigoConfigError);
    assert.throws(() => client.customers.getById(undefined), SiigoConfigError);
  });

  it('findByIdentification() returns first match or null', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      { status: 200, body: { results: [{ id: 7, identification: '900123456' }] } },
      { status: 200, body: { results: [] } },
    ]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    const found = await client.customers.findByIdentification('900123456');
    assert.equal(found.id, 7);
    const missing = await client.customers.findByIdentification('000000000');
    assert.equal(missing, null);
  });

  it('create() POSTs JSON to /customers with bearer token', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      { status: 201, body: { id: 99 } },
    ]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    const created = await client.customers.create({
      type: 'Customer',
      person_type: 'Company',
      id_type: '31',
      identification: '900123456',
      name: ['ACME', 'SAS'],
    });
    assert.equal(created.id, 99);
    const call = fetchMock.calls[1];
    assert.equal(call.init.method, 'POST');
    assert.equal(call.init.headers['Content-Type'], 'application/json');
    assert.equal(call.init.headers.Authorization, 'Bearer tok');
    assert.deepEqual(JSON.parse(call.init.body).name, ['ACME', 'SAS']);
  });

  it('create() rejects non-object bodies', async () => {
    const fetchMock = makeMockFetch([{ status: 200, body: { access_token: 'tok', expires_in: 3600 } }]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    assert.throws(() => client.customers.create(null), SiigoConfigError);
    assert.throws(() => client.customers.create('string-body'), SiigoConfigError);
    assert.throws(() => client.customers.create([]), SiigoConfigError);
  });

  it('update() PUTs to /customers/:id', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      { status: 200, body: { id: 42, name: ['Updated'] } },
    ]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    await client.customers.update(42, { name: ['Updated'] });
    assert.equal(fetchMock.calls[1].init.method, 'PUT');
    assert.equal(fetchMock.calls[1].url, 'https://api.siigo.com/v1/customers/42');
  });

  it('delete() DELETEs /customers/:id', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      { status: 204, body: '' },
    ]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    const out = await client.customers.delete(42);
    assert.equal(out, null);
    assert.equal(fetchMock.calls[1].init.method, 'DELETE');
  });

  it('surfaces Siigo 422 errors as SiigoValidationError with .errors[]', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      {
        status: 422,
        body: { Errors: [{ Code: 'identification_invalid', Message: 'NIT format invalid' }] },
      },
    ]);
    const client = createSiigoClientWithResources({ fetch: fetchMock, sleep: async () => {} });
    await assert.rejects(
      client.customers.create({ identification: 'BAD' }),
      err => {
        assert.ok(err instanceof SiigoValidationError);
        assert.equal(err.status, 422);
        assert.equal(err.errors.length, 1);
        assert.equal(err.errors[0].Code, 'identification_invalid');
        return true;
      }
    );
  });
});
