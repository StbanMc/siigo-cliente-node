# Changelog

All notable changes to this project are documented here. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] — 2026-05-18

First public release.

### Added
- HTTP transport on Node 18+ `fetch` and `AbortController`, with
  exponential backoff + jitter, retry on `429/502/503/504`, honour of
  `Retry-After` (numeric and HTTP-date forms), per-request timeout,
  external `AbortSignal` support.
- OAuth2 token provider for `POST {host}/auth`, with in-memory cache,
  configurable renewal margin, and serialised concurrent renewals.
- `createClient({ username, accessKey })` factory with auto-attached
  resource namespaces.
- Resources:
  - `client.customers` — list, paginate, getById, findByIdentification,
    create, update, delete
  - `client.invoices` — list, paginate, getById, create, stamp,
    getPdfLink
  - `client.products` — list, paginate, getById, findByCode, create,
    update, delete
  - `client.vouchers` — list, paginate, getById, create
  - `client.creditNotes` — list, paginate, getById, create
  - `client.payments` — list, paginate, getById (payment-types catalog)
  - `client.accountStatements` — list, paginate (path override
    supported)
- Typed error hierarchy: `SiigoError`, `SiigoAuthError`,
  `SiigoRateLimitError`, `SiigoValidationError`, `SiigoNotFoundError`,
  `SiigoNetworkError`, `SiigoConfigError`. HTTP status to error class
  mapping centralised in `classifyHttpError()`.
- TypeScript declarations (`types/index.d.ts`, `types/errors.d.ts`).
- Bilingual README (en/es) with quick start, configuration matrix,
  error types and roadmap.
- 3 runnable examples: list customers, paginate invoices, create
  invoice + fetch PDF.
- CI matrix on Node 18/20/22 × Ubuntu/macOS/Windows.
- `tools/check-zero-deps.mjs` to guarantee zero dependencies on every
  release.
- Community files: Code of Conduct (Contributor Covenant 2.1),
  CONTRIBUTING, SECURITY, bug-report and feature-request issue
  templates, PR template.

### Constraints (locked in for 1.0)
- Zero runtime dependencies. Validated in CI.
- Zero dev dependencies. Built-in `node --test` runner.
- ESM only. No CJS dual build.
- Node ≥ 18.
- The SDK never reads `process.env` on its own; the caller owns its
  secrets.

[Unreleased]: https://github.com/StbanMc/siigo-cliente-node/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/StbanMc/siigo-cliente-node/releases/tag/v0.1.0
