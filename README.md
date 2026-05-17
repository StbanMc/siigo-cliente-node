# siigo-cliente-node

> Tiny, zero-dependency Node.js client for the Siigo REST API.
> LATAM-first. ESM. TypeScript types included.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![Zero deps](https://img.shields.io/badge/dependencies-0-brightgreen)

> **Status: 0.1.0-pre — work in progress.** Core HTTP transport, OAuth2
> token provider, and the `createClient()` factory are in. Resources
> (customers, invoices, products, vouchers, credit-notes, payments,
> account-statements) land next. The first published `0.1.0` will ship
> with full CRUD on customers/invoices/products and CI matrix on Node
> 18/20/22.

[Leer en español](README.es.md)

---

## Why

I run a Colombian outsourcing business that integrates with the Siigo
ERP API in production every day. The Node ecosystem has zero
maintained SDKs for Siigo — only abandoned wrappers without types,
tests, or pagination helpers. So I'm publishing the SDK shape I use
day-to-day, rewritten clean, MIT-licensed.

Design rules:

- **Zero runtime dependencies.** Validated in CI on every commit.
- **Node ≥ 18.** Uses native `fetch` and `AbortController`.
- **ESM.** Modern stack from day one — no `require()` ceremony.
- **Typed errors.** Catch by class (`SiigoAuthError`, `SiigoRateLimitError`, …), never by string.
- **Retry that respects the protocol.** Honours `Retry-After`, retries `429/502/503/504` with exponential backoff + jitter.
- **No secrets in code.** Credentials come from the caller; the SDK never reads `.env` or `process.env` on its own.

---

## Install

```bash
npm install siigo-cliente-node
```

---

## Quick start

```js
import { createClient } from 'siigo-cliente-node';

const client = createClient({
  username: process.env.SIIGO_USERNAME,
  accessKey: process.env.SIIGO_ACCESS_KEY,
});

// Low-level API (always available)
const customer = await client.api.get('/customers/12345');

// Paginate a collection lazily
for await (const invoice of client.api.paginate('/invoices', {
  params: { created_start: '2026-01-01' },
})) {
  console.log(invoice.id, invoice.total);
}

// Or collect everything at once
const products = await client.api.collect('/products', { params: { active: true } });
```

> Resource namespaces (`client.customers.list()`, `client.invoices.create()`, …) are landing in the next commits.

---

## Configuration

| Option           | Default                                       | Purpose                                              |
|------------------|-----------------------------------------------|------------------------------------------------------|
| `username`       | —                                             | **Required.** Siigo API username.                    |
| `accessKey`      | —                                             | **Required.** Siigo API access key.                  |
| `baseUrl`        | `https://api.siigo.com/v1`                    | Override for sandbox or proxy.                       |
| `authUrl`        | derived from `baseUrl`                        | Override the `/auth` endpoint.                       |
| `partnerId`      | `siigo-cliente-node`                          | `Partner-Id` header value.                           |
| `userAgent`      | `siigo-cliente-node/<version>`                | `User-Agent` header.                                 |
| `timeoutMs`      | `60_000`                                      | Per-request timeout.                                 |
| `maxRetries`     | `3`                                           | Max retry attempts.                                  |
| `baseDelayMs`    | `1500`                                        | Exponential backoff base.                            |
| `maxDelayMs`     | `30_000`                                      | Backoff cap.                                         |
| `retryStatuses`  | `[429, 502, 503, 504]`                        | Which HTTP statuses are retried.                     |
| `renewMarginMs`  | `300_000`                                     | Refresh the token this long before it expires.       |
| `fetch`          | `globalThis.fetch`                            | Inject a custom fetch (testing, proxies).            |

---

## Error types

```js
import {
  SiigoError,           // base class
  SiigoAuthError,       // 401 / 403 / auth handshake failed
  SiigoRateLimitError,  // 429 with exhausted retries — carries .retryAfterMs
  SiigoValidationError, // 400 / 422 — carries .errors[]
  SiigoNotFoundError,   // 404
  SiigoNetworkError,    // fetch/timeout/socket failure
  SiigoConfigError,     // bad arguments to createClient/registerResource
} from 'siigo-cliente-node';
```

---

## Roadmap

- v0.1.x — resources: customers, invoices, products, vouchers, credit-notes, payments, account-statements
- v0.2.x — webhook signature verification (when Siigo publishes one), batch helpers
- v1.0   — stability promise, full coverage of every documented endpoint

Want a resource added? Open an issue.

---

## License

[MIT](LICENSE) © Esteban Esquivel
