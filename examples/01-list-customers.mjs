// Example: list every customer in the Siigo account.
//
// Run:
//   SIIGO_USERNAME=you@example.com \
//   SIIGO_ACCESS_KEY=...           \
//   node examples/01-list-customers.mjs
//
// The example does NOT hit Siigo unless you provide real credentials.
// Without them it exits with a clear message.

import { createClient } from 'siigo-cliente-node';

const { SIIGO_USERNAME, SIIGO_ACCESS_KEY } = process.env;

if (!SIIGO_USERNAME || !SIIGO_ACCESS_KEY) {
  console.error('Set SIIGO_USERNAME and SIIGO_ACCESS_KEY to run this example.');
  process.exit(1);
}

const client = createClient({
  username: SIIGO_USERNAME,
  accessKey: SIIGO_ACCESS_KEY,
});

const customers = await client.customers.list({ active: true });
console.log(`Fetched ${customers.length} active customers`);

for (const c of customers.slice(0, 5)) {
  const name = Array.isArray(c.name) ? c.name.join(' ') : c.name;
  console.log(`  - [${c.identification}] ${name}`);
}
