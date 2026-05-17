# siigo-cliente-node

> Tiny, zero-dependency Node.js client for the Siigo REST API.
> LATAM-first. ESM. TypeScript types included.

[![CI](https://github.com/StbanMc/siigo-cliente-node/actions/workflows/ci.yml/badge.svg)](https://github.com/StbanMc/siigo-cliente-node/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![Zero deps](https://img.shields.io/badge/dependencies-0-brightgreen)

> **Status: 0.1.0 — first public release.** Resources for customers,
> invoices, products, vouchers, credit-notes, payments
> (payment-types catalog), and account-statements are in. CI matrix
> on Node 18/20/22 × Ubuntu/macOS/Windows. Stability promise lands
> with v1.0.0.

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

// Resource namespaces (recommended)
const customer = await client.customers.findByIdentification('900123456');
const invoice  = await client.invoices.create({ document: { id: 24446 }, /* … */ });
const pdf      = await client.invoices.getPdfLink(invoice.id);

// Paginate lazily
for await (const inv of client.invoices.paginate({ date_start: '2026-01-01' })) {
  console.log(inv.id, inv.total);
}

// Drop down to the low-level API anytime
const raw = await client.api.get('/customers/12345');
```

## Resources

| Namespace               | Methods                                                                   |
|-------------------------|---------------------------------------------------------------------------|
| `client.customers`      | `list`, `paginate`, `getById`, `findByIdentification`, `create`, `update`, `delete` |
| `client.invoices`       | `list`, `paginate`, `getById`, `create`, `stamp`, `getPdfLink`            |
| `client.products`       | `list`, `paginate`, `getById`, `findByCode`, `create`, `update`, `delete` |
| `client.vouchers`       | `list`, `paginate`, `getById`, `create`                                   |
| `client.creditNotes`    | `list`, `paginate`, `getById`, `create`                                   |
| `client.payments`       | `list`, `paginate`, `getById` (payment-types catalog)                     |
| `client.accountStatements` | `list`, `paginate` (`{ path }` override supported)                     |

Need an endpoint that isn't here yet? Use `client.api.get/post/put/patch/delete`,
or open a [feature request](https://github.com/StbanMc/siigo-cliente-node/issues/new/choose).
You can also attach your own resources with `registerResource(client, name, factory)`.

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
