/**
 * `client.customers` resource.
 *
 * Maps to the Siigo `/v1/customers` endpoints:
 *   - GET    /customers              → list, paginate, collect
 *   - GET    /customers/:id          → getById
 *   - GET    /customers?identification=… → findByIdentification (helper)
 *   - POST   /customers              → create
 *   - PUT    /customers/:id          → update (full replace, as Siigo spec)
 *   - DELETE /customers/:id          → delete
 *
 * The SDK does NOT validate request bodies against a schema. Siigo's
 * payload shapes change occasionally; the caller passes what Siigo
 * accepts, and Siigo's own 422 responses surface as `SiigoValidationError`
 * carrying `err.errors[]` for actionable feedback.
 */

import { SiigoConfigError } from '../errors.js';

const RESOURCE_PATH = '/customers';

/**
 * @param {object} api  The api surface from createClient (`client.api`).
 */
export function createCustomersResource(api) {
  function assertId(id) {
    if (id === undefined || id === null || id === '') {
      throw new SiigoConfigError('customers: an `id` is required');
    }
  }
  function assertBody(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new SiigoConfigError('customers: a request body object is required');
    }
  }

  return {
    /**
     * List customers as a single array, walking every page.
     * For large datasets prefer `paginate()`.
     *
     * @param {object} [filters] Siigo accepts `identification`, `branch_office`,
     *                           `active`, `name`, `created_start`, `created_end`,
     *                           `updated_start`, `updated_end`, `page`, `page_size`.
     * @param {{signal?:AbortSignal, pageSize?:number}} [options]
     */
    list(filters = {}, options = {}) {
      const { signal, pageSize } = options;
      return api.collect(RESOURCE_PATH, { params: filters, signal, pageSize });
    },

    /**
     * Async iterator: yields each customer without buffering the whole set.
     *
     *   for await (const c of client.customers.paginate({ active: true })) { ... }
     */
    paginate(filters = {}, options = {}) {
      const { signal, pageSize } = options;
      return api.paginate(RESOURCE_PATH, { params: filters, signal, pageSize });
    },

    /**
     * Fetch a single customer by its Siigo id.
     */
    getById(id, options = {}) {
      assertId(id);
      const { signal } = options;
      return api.get(`${RESOURCE_PATH}/${encodeURIComponent(id)}`, { signal });
    },

    /**
     * Convenience: find a customer by national id (NIT/CC).
     * Returns the first match or `null`.
     */
    async findByIdentification(identification, options = {}) {
      if (!identification) {
        throw new SiigoConfigError('customers.findByIdentification: identification is required');
      }
      const { signal } = options;
      const resp = await api.get(RESOURCE_PATH, {
        params: { identification },
        signal,
      });
      const items = Array.isArray(resp) ? resp : Array.isArray(resp?.results) ? resp.results : [];
      return items[0] ?? null;
    },

    /**
     * Create a customer.
     */
    create(body, options = {}) {
      assertBody(body);
      const { signal, headers } = options;
      return api.post(RESOURCE_PATH, body, { signal, headers });
    },

    /**
     * Replace a customer (PUT). Siigo's API is replace-semantics on
     * the customer record; if you only want a partial change, fetch
     * with `getById` first and merge before sending.
     */
    update(id, body, options = {}) {
      assertId(id);
      assertBody(body);
      const { signal, headers } = options;
      return api.put(`${RESOURCE_PATH}/${encodeURIComponent(id)}`, body, { signal, headers });
    },

    /**
     * Delete a customer.
     */
    delete(id, options = {}) {
      assertId(id);
      const { signal } = options;
      return api.delete(`${RESOURCE_PATH}/${encodeURIComponent(id)}`, { signal });
    },
  };
}
