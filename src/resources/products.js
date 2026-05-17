/**
 * `client.products` resource.
 *
 *   - GET    /products              → list / paginate
 *   - GET    /products/:id          → getById
 *   - POST   /products              → create
 *   - PUT    /products/:id          → update
 *   - DELETE /products/:id          → delete
 */

import { SiigoConfigError } from '../errors.js';

const RESOURCE_PATH = '/products';

export function createProductsResource(api) {
  function assertId(id) {
    if (id === undefined || id === null || id === '') {
      throw new SiigoConfigError('products: an `id` is required');
    }
  }
  function assertBody(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new SiigoConfigError('products: a request body object is required');
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

    /**
     * Convenience: find a product by Siigo code (SKU). Returns the
     * first match or `null`.
     */
    async findByCode(code, options = {}) {
      if (!code) {
        throw new SiigoConfigError('products.findByCode: code is required');
      }
      const resp = await api.get(RESOURCE_PATH, {
        params: { code },
        signal: options.signal,
      });
      const items = Array.isArray(resp) ? resp : Array.isArray(resp?.results) ? resp.results : [];
      return items[0] ?? null;
    },

    create(body, options = {}) {
      assertBody(body);
      return api.post(RESOURCE_PATH, body, {
        signal: options.signal,
        headers: options.headers,
      });
    },

    update(id, body, options = {}) {
      assertId(id);
      assertBody(body);
      return api.put(`${RESOURCE_PATH}/${encodeURIComponent(id)}`, body, {
        signal: options.signal,
        headers: options.headers,
      });
    },

    delete(id, options = {}) {
      assertId(id);
      return api.delete(`${RESOURCE_PATH}/${encodeURIComponent(id)}`, { signal: options.signal });
    },
  };
}
