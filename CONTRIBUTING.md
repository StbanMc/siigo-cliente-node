# Contributing to siigo-cliente-node

Thanks for considering a contribution. Real-world usage of the Siigo
API in production is what makes this SDK valuable, so reports and PRs
grounded in actual integration experience are especially welcome.

## What kind of contributions fit

Yes please:

- **Bug reports** with a repro: the request you sent (sanitised — no
  real `access_key`), the response you got, what you expected.
- **PRs that add a missing endpoint** — Siigo exposes more resources
  than v0.1 covers (purchases, journals, cost centers, taxes,
  document types, …). One resource per PR, following the shape of
  `src/resources/customers.js`.
- **PRs that improve error messages, types, or docs** when something
  was unclear from the API surface.

Probably not yet:

- New runtime dependencies. **This project is zero-deps.** It's
  validated in CI on every commit; a PR that adds a dependency will be
  rejected unless there is a strong reason debated in an issue first.
- Bundlers, transpilers, or a switch from ESM to CJS. We're ESM-only
  on Node ≥ 18.
- Renames or large refactors without a paired discussion issue.

## Development setup

```bash
git clone https://github.com/StbanMc/siigo-cliente-node.git
cd siigo-cliente-node
# no `npm install` needed — there are no dependencies
npm test
node tools/check-zero-deps.mjs
```

Tests use the built-in Node test runner and a hand-rolled mock fetch
in `tests/_helpers.mjs`. No real network access required, ever.

## PR checklist

- [ ] Tests added or updated, all green (`npm test`)
- [ ] `node tools/check-zero-deps.mjs` still passes
- [ ] If you touched the public surface, `types/index.d.ts` is updated
- [ ] If user-visible, README.md and README.es.md mention the change
- [ ] Commit messages explain the *why*, not just the *what*
- [ ] No `console.log` left in src/

## Coding style

- ESM, top-level `await` ok, no `require()`
- 2-space indentation, single quotes, no trailing semicolons in JSDoc
- One resource per file under `src/resources/`
- Each resource exports a `create*Resource(api)` factory
- Errors thrown to the caller must be instances of a `Siigo*Error` class
- Don't read `process.env` from inside the SDK — credentials come from
  the caller's `createClient({ username, accessKey })` call only

## Release process (for maintainer)

1. Update `CHANGELOG.md` with the new version section
2. Bump `version` in `package.json` (semver)
3. `npm test`
4. `git tag v0.X.Y && git push --tags`
5. `npm publish --access public`

## Reporting security issues

Please don't open a public issue. See [SECURITY.md](SECURITY.md).
