import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSiigoClientWithResources, makeMockFetch } from './_helpers.mjs';
import { SiigoConfigError, SiigoValidationError } from '../src/index.js';

describe('client.invoices', () => {
  it('list() applies filters and walks pages', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      { status: 200, body: { results: [{ id: 1 }, { id: 2 }], pagination: { total_results: 2 } } },
    ]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    const out = await client.invoices.list({
      created_start: '2026-01-01',
      created_end: '2026-01-31',
    });
    assert.equal(out.length, 2);
    const url = new URL(fetchMock.calls[1].url);
    assert.equal(url.searchParams.get('created_start'), '2026-01-01');
    assert.equal(url.searchParams.get('created_end'), '2026-01-31');
  });

  it('getById() targets /invoices/:id', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      { status: 200, body: { id: 'abc-123', total: 100000 } },
    ]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    const inv = await client.invoices.getById('abc-123');
    assert.equal(inv.total, 100000);
    assert.equal(fetchMock.calls[1].url, 'https://api.siigo.com/v1/invoices/abc-123');
  });

  it('create() POSTs the body', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      { status: 201, body: { id: 'new-1' } },
    ]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    await client.invoices.create({
      document: { id: 24446 },
      date: '2026-05-18',
      customer: { identification: '900123456', branch_office: 0 },
      items: [{ code: 'P01', quantity: 1, price: 50000 }],
      payments: [{ id: 5636, value: 50000 }],
    });
    const call = fetchMock.calls[1];
    assert.equal(call.init.method, 'POST');
    assert.equal(call.url, 'https://api.siigo.com/v1/invoices');
    assert.equal(JSON.parse(call.init.body).items[0].code, 'P01');
  });

  it('create() refuses bad bodies', async () => {
    const fetchMock = makeMockFetch([{ status: 200, body: { access_token: 'tok', expires_in: 3600 } }]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    assert.throws(() => client.invoices.create(null), SiigoConfigError);
    assert.throws(() => client.invoices.create([1, 2]), SiigoConfigError);
  });

  it('stamp() POSTs to /invoices/:id/stamp', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      { status: 200, body: { cufe: 'cufe-abc' } },
    ]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    const out = await client.invoices.stamp('new-1');
    assert.equal(out.cufe, 'cufe-abc');
    assert.equal(fetchMock.calls[1].init.method, 'POST');
    assert.equal(fetchMock.calls[1].url, 'https://api.siigo.com/v1/invoices/new-1/stamp');
  });

  it('getPdfLink() returns PDF metadata', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      { status: 200, body: { url: 'https://...', expires_in: 60 } },
    ]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    const out = await client.invoices.getPdfLink('new-1');
    assert.equal(out.expires_in, 60);
  });

  it('Siigo 422 on invoice create → SiigoValidationError', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      {
        status: 422,
        body: { Errors: [{ Code: 'document_required', Message: 'document.id is required' }] },
      },
    ]);
    const client = createSiigoClientWithResources({ fetch: fetchMock, sleep: async () => {} });
    await assert.rejects(
      client.invoices.create({ customer: { identification: '900' } }),
      err => {
        assert.ok(err instanceof SiigoValidationError);
        assert.equal(err.errors[0].Code, 'document_required');
        return true;
      }
    );
  });
});
