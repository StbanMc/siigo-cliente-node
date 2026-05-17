// Example: iterate every invoice in a date range without loading them
// all into memory at once.
//
// Run:
//   SIIGO_USERNAME=you@example.com \
//   SIIGO_ACCESS_KEY=...           \
//   node examples/02-paginate-invoices.mjs

import { createClient, SiigoRateLimitError } from 'siigo-cliente-node';

const { SIIGO_USERNAME, SIIGO_ACCESS_KEY } = process.env;

if (!SIIGO_USERNAME || !SIIGO_ACCESS_KEY) {
  console.error('Set SIIGO_USERNAME and SIIGO_ACCESS_KEY to run this example.');
  process.exit(1);
}

const client = createClient({
  username: SIIGO_USERNAME,
  accessKey: SIIGO_ACCESS_KEY,
});

const start = '2026-01-01';
const end = '2026-01-31';
let total = 0;
let totalAmount = 0;

try {
  for await (const invoice of client.invoices.paginate({
    date_start: start,
    date_end: end,
  })) {
    total += 1;
    totalAmount += invoice.total ?? 0;
    if (total % 50 === 0) process.stdout.write(`  ${total} so far…\r`);
  }
  console.log(`\nProcessed ${total} invoices between ${start} and ${end}.`);
  console.log(`Sum of totals: ${totalAmount.toLocaleString('es-CO')}`);
} catch (err) {
  if (err instanceof SiigoRateLimitError) {
    console.error(`Rate limited. Retry after ${err.retryAfterMs ?? '?'} ms.`);
    process.exit(2);
  }
  throw err;
}
