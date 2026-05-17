/**
 * `client.payments` — payment method definitions (formas de pago configuradas
 * en la cuenta Siigo). Mostly read-only.
 *
 *   - GET    /payment-types        → list / paginate (Siigo path is `/payment-types`)
 *   - GET    /payment-types/:id    → getById
 *
 * Note: this resource exposes the *catalog* of payment types, not
 * the individual incoming payments (those live as `vouchers`).
 */

import { SiigoConfigError } from '../errors.js';

const RESOURCE_PATH = '/payment-types';

export function createPaymentsResource(api) {
  function assertId(id) {
    if (id === undefined || id === null || id === '') {
      throw new SiigoConfigError('payments: an `id` is required');
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
  };
}
