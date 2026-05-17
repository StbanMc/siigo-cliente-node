/**
 * `client.vouchers` — payment receipts / comprobantes de ingreso.
 *
 *   - GET    /vouchers              → list / paginate
 *   - GET    /vouchers/:id          → getById
 *   - POST   /vouchers              → create
 */

import { SiigoConfigError } from '../errors.js';

const RESOURCE_PATH = '/vouchers';

export function createVouchersResource(api) {
  function assertId(id) {
    if (id === undefined || id === null || id === '') {
      throw new SiigoConfigError('vouchers: an `id` is required');
    }
  }
  function assertBody(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new SiigoConfigError('vouchers: a request body object is required');
    }
  }

  return {
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
    create(body, options = {}) {
      assertBody(body);
      return api.post(RESOURCE_PATH, body, {
        signal: options.signal,
        headers: options.headers,
      });
    },
  };
}
