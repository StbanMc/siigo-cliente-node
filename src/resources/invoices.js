/**
 * `client.invoices` resource — sales invoices.
 *
 * Maps to the Siigo `/v1/invoices` endpoints:
 *   - GET    /invoices              → list, paginate, collect
 *   - GET    /invoices/:id          → getById
 *   - POST   /invoices              → create
 *   - GET    /invoices/:id/pdf      → downloadPdf (Siigo returns a URL or a stream)
 *   - POST   /invoices/:id/stamp    → stamp / send to DIAN (electronic invoice)
 *
 * Cancellation / void of an invoice goes via credit notes in Siigo's
 * model — see `client.creditNotes`.
 */

import { SiigoConfigError } from '../errors.js';

const RESOURCE_PATH = '/invoices';

export function createInvoicesResource(api) {
  function assertId(id) {
    if (id === undefined || id === null || id === '') {
      throw new SiigoConfigError('invoices: an `id` is required');
    }
  }
  function assertBody(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new SiigoConfigError('invoices: a request body object is required');
    }
  }

  return {
    /**
     * List invoices, walking every page.
     *
     * @param {object} [filters] Siigo accepts `created_start`, `created_end`,
     *                           `date_start`, `date_end`, `customer_branch_office`,
     *                           `customer_identification`, `document_id`,
     *                           `id` (invoice id), `name`, `number`, `page`,
     *                           `page_size`, `pointer`.
     * @param {{signal?:AbortSignal, pageSize?:number}} [options]
     */
    list(filters = {}, options = {}) {
      return api.collect(RESOURCE_PATH, {
        params: filters,
        signal: options.signal,
        pageSize: options.pageSize,
      });
    },

    paginate(filters = {}, options = {}) {
      return api.paginate(RESOURCE_PATH, {
        params: filters,
        signal: options.signal,
        pageSize: options.pageSize,
      });
    },

    getById(id, options = {}) {
      assertId(id);
      return api.get(`${RESOURCE_PATH}/${encodeURIComponent(id)}`, { signal: options.signal });
    },

    /**
     * Create an invoice. Siigo expects a fairly large shape — at minimum:
     *   document: { id },
     *   date,
     *   customer: { identification, branch_office? },
     *   items: [{ code, quantity, price, ... }],
     *   payments: [{ id, value, due_date? }]
     *
     * The SDK does not impose this shape — Siigo's own validation
     * surfaces as SiigoValidationError with `err.errors[]`.
     */
    create(body, options = {}) {
      assertBody(body);
      return api.post(RESOURCE_PATH, body, {
        signal: options.signal,
        headers: options.headers,
      });
    },

    /**
     * Trigger electronic invoice issuing (DIAN).
     * Siigo exposes this as POST /invoices/:id/stamp; body is optional.
     */
    stamp(id, body = {}, options = {}) {
      assertId(id);
      return api.post(`${RESOURCE_PATH}/${encodeURIComponent(id)}/stamp`, body, {
        signal: options.signal,
        headers: options.headers,
      });
    },

    /**
     * Request the PDF link / stream for an invoice.
     * Siigo returns `{ url, expires_in }` on success.
     */
    getPdfLink(id, options = {}) {
      assertId(id);
      return api.get(`${RESOURCE_PATH}/${encodeURIComponent(id)}/pdf`, { signal: options.signal });
    },
  };
}
