// Example: create an electronic invoice in Siigo, then request its PDF.
//
// WARNING: in a real account this CREATES BILLING DATA. Run only with
// a sandbox tenant or with values you've validated for your business.
//
// Run:
//   SIIGO_USERNAME=you@example.com \
//   SIIGO_ACCESS_KEY=...           \
//   SIIGO_DOCUMENT_ID=24446        \
//   SIIGO_CUSTOMER_NIT=900123456   \
//   SIIGO_PRODUCT_CODE=P-001       \
//   SIIGO_PAYMENT_TYPE_ID=5636     \
//   node examples/03-create-invoice.mjs

import { createClient, SiigoValidationError } from 'siigo-cliente-node';

const env = {
  username:        process.env.SIIGO_USERNAME,
  accessKey:       process.env.SIIGO_ACCESS_KEY,
  documentId:      process.env.SIIGO_DOCUMENT_ID,
  customerNit:     process.env.SIIGO_CUSTOMER_NIT,
  productCode:     process.env.SIIGO_PRODUCT_CODE,
  paymentTypeId:   process.env.SIIGO_PAYMENT_TYPE_ID,
};

for (const [k, v] of Object.entries(env)) {
  if (!v) {
    console.error(`Missing env: SIIGO_${k.replace(/([A-Z])/g, '_$1').toUpperCase()}`);
    process.exit(1);
  }
}

const client = createClient({
  username: env.username,
  accessKey: env.accessKey,
});

const today = new Date().toISOString().slice(0, 10);

const invoiceBody = {
  document: { id: Number(env.documentId) },
  date: today,
  customer: { identification: env.customerNit, branch_office: 0 },
  items: [
    { code: env.productCode, quantity: 1, price: 50_000 },
  ],
  payments: [
    { id: Number(env.paymentTypeId), value: 50_000, due_date: today },
  ],
};

try {
  const created = await client.invoices.create(invoiceBody);
  console.log(`Invoice created: id=${created.id} number=${created.number ?? '?'}`);

  const pdf = await client.invoices.getPdfLink(created.id);
  console.log(`PDF link (expires in ${pdf.expires_in}s): ${pdf.url}`);
} catch (err) {
  if (err instanceof SiigoValidationError) {
    console.error('Siigo rejected the invoice:');
    for (const e of err.errors) {
      console.error(`  - ${e.Code ?? e.code}: ${e.Message ?? e.message}`);
    }
    process.exit(2);
  }
  throw err;
}
