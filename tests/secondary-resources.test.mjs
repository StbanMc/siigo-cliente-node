// Tests for the lighter resources: vouchers, creditNotes, payments,
// accountStatements. One coverage pass each — we already exercise
// pagination, retry, auth in customers/invoices/products tests.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSiigoClientWithResources, makeMockFetch } from './_helpers.mjs';
import { SiigoConfigError } from '../src/index.js';

describe('client.vouchers', () => {
  it('list + getById + create', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      { status: 200, body: { results: [{ id: 'v1' }], pagination: { total_results: 1 } } },
      { status: 200, body: { id: 'v1' } },
      { status: 201, body: { id: 'v-new' } },
    ]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });

    const list = await client.vouchers.list();
    assert.equal(list.length, 1);

    const one = await client.vouchers.getById('v1');
    assert.equal(one.id, 'v1');

    const created = await client.vouchers.create({
      document: { id: 27441 },
      date: '2026-05-18',
      customer: { identification: '900123456' },
      items: [{ due: { prefix: 'FV', consecutive: 12 }, value: 100000 }],
      payment: { id: 5636, value: 100000 },
    });
    assert.equal(created.id, 'v-new');
  });

  it('vouchers.getById refuses empty id', async () => {
    const client = createSiigoClientWithResources({ fetch: makeMockFetch([{ status: 200, body: { access_token: 't', expires_in: 3600 } }]) });
    assert.throws(() => client.vouchers.getById(null), SiigoConfigError);
  });
});

describe('client.creditNotes', () => {
  it('list + create', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      { status: 200, body: { results: [], pagination: { total_results: 0 } } },
      { status: 201, body: { id: 'cn-1' } },
    ]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    await client.creditNotes.list();
    const cn = await client.creditNotes.create({ invoice: { id: 'inv-1' } });
    assert.equal(cn.id, 'cn-1');
    assert.equal(fetchMock.calls[1].url, 'https://api.siigo.com/v1/credit-notes?page=1&page_size=100');
  });
});

describe('client.payments', () => {
  it('list maps to /payment-types', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      { status: 200, body: { results: [{ id: 5636, name: 'Cash' }], pagination: { total_results: 1 } } },
    ]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    const out = await client.payments.list();
    assert.equal(out[0].name, 'Cash');
    const url = new URL(fetchMock.calls[1].url);
    assert.equal(url.pathname, '/v1/payment-types');
  });
});

describe('client.accountStatements', () => {
  it('list with default path /account-statement', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      { status: 200, body: { results: [{ id: 1 }], pagination: { total_results: 1 } } },
    ]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    await client.accountStatements.list({ customer_identification: '900' });
    const url = new URL(fetchMock.calls[1].url);
    assert.equal(url.pathname, '/v1/account-statement');
    assert.equal(url.searchParams.get('customer_identification'), '900');
  });

  it('list honours custom path override', async () => {
    const fetchMock = makeMockFetch([
      { status: 200, body: { access_token: 'tok', expires_in: 3600 } },
      { status: 200, body: { results: [] } },
    ]);
    const client = createSiigoClientWithResources({ fetch: fetchMock });
    await client.accountStatements.list({}, { path: '/account-statements' });
    const url = new URL(fetchMock.calls[1].url);
    assert.equal(url.pathname, '/v1/account-statements');
  });
});
