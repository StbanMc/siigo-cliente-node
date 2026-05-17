import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSiigoClientWithResources, makeMockFetch } from './_helpers.mjs';
import { SiigoConfigError } from '../src/index.js';

describe('client.products', () => {
  it('list() walks pagination', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      { status: 200, body: { results: [{ id: 1 }], pagination: { total_results: 1 } } },
    ]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    const out = await client.products.list();
    assert.equal(out.length, 1);
  });

  it('getById()', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      { status: 200, body: { id: 'sku-1', code: 'SKU-001', name: 'Widget' } },
    ]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    const p = await client.products.getById('sku-1');
    assert.equal(p.code, 'SKU-001');
  });

  it('findByCode() returns first match or null', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      { status: 200, body: { results: [{ id: 'p1', code: 'A' }] } },
      { status: 200, body: { results: [] } },
    ]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    const found = await client.products.findByCode('A');
    assert.equal(found.code, 'A');
    const missing = await client.products.findByCode('Z');
    assert.equal(missing, null);
  });

  it('findByCode() rejects empty code', async () => {
    const fetchMock = makeMockFetch([{ status: 200, body: { access_token: 'tok', expires_in: 3600 } }]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    await assert.rejects(client.products.findByCode(''), SiigoConfigError);
  });

  it('create() / update() / delete()', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      { status: 201, body: { id: 'new' } },
      { status: 200, body: { id: 'new', name: 'Renamed' } },
      { status: 204, body: '' },
    ]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    await client.products.create({ code: 'SKU', name: 'X', type: 'Product' });
    await client.products.update('new', { code: 'SKU', name: 'Renamed', type: 'Product' });
    await client.products.delete('new');

    assert.equal(fetchMock.calls[1].init.method, 'POST');
    assert.equal(fetchMock.calls[2].init.method, 'PUT');
    assert.equal(fetchMock.calls[3].init.method, 'DELETE');
  });
});
