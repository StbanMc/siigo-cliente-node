# Examples

Runnable scripts. Each one expects a Siigo API user via env vars and
exits with a clear message if any are missing — it will never silently
hit a production tenant.

| File | What it does |
|---|---|
| [`01-list-customers.mjs`](01-list-customers.mjs) | Fetches every active customer and prints the first five. |
| [`02-paginate-invoices.mjs`](02-paginate-invoices.mjs) | Streams invoices in a date range without loading them all into memory. |
| [`03-create-invoice.mjs`](03-create-invoice.mjs) | Creates an electronic invoice and requests its PDF link. **Writes data** — sandbox tenant only. |

## Running locally against this checkout

```bash
# from the repo root
npm install   # installs nothing (zero deps), just sets up the link
node examples/01-list-customers.mjs
```

To run an example before you've published the package, replace
`from 'siigo-cliente-node'` with a relative path:

```js
import { createClient } from '../src/index.js';
```

…or `npm link` the local package into the example folder.
