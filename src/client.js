/**
 * Public entry point: `createClient(...)` returns a configured Siigo client.
 *
 * Resources hang off the client as namespaces:
 *
 *   const client = createClient({ username, accessKey });
 *   await client.customers.list({ identification: '123' });
 *
 * The client owns:
 *   - an HTTP transport (retry, timeout, headers)
 *   - a token provider (auth cache)
 *   - resource namespaces (filled in by registerResource)
 *
 * Resources never see credentials. They get a small surface
 * (`apiGet`, `apiPaginate`, `apiPost`, …) and let the client handle auth.
 */

import { createHttpClient } from './http.js';
import { createTokenProvider } from './auth.js';
import { SiigoConfigError } from './errors.js';

const DEFAULT_BASE_URL = 'https://api.siigo.com/v1';
const DEFAULT_PAGE_SIZE = 100;
const PAGINATION_SAFETY_PAGES = 200;

/**
 * @typedef {Object} ClientOptions
 * @property {string} username                    Siigo API username (email).
 * @property {string} accessKey                   Siigo API access key.
 * @property {string} [baseUrl]                   Override base URL. Defaults to `https://api.siigo.com/v1`.
 * @property {string} [authUrl]                   Override auth endpoint. Defaults to `<baseUrl-without-/v1>/auth`.
 * @property {string} [partnerId]                 Custom `Partner-Id` header.
 * @property {string} [userAgent]                 Custom `User-Agent` header.
 * @property {number} [timeoutMs]                 Per-request timeout.
 * @property {number} [maxRetries]                Max retry attempts.
 * @property {number} [baseDelayMs]               Backoff base.
 * @property {number} [maxDelayMs]                Backoff cap.
 * @property {number[]} [retryStatuses]           HTTP statuses to retry.
 * @property {number} [renewMarginMs]             Token renewal margin.
 * @property {typeof fetch} [fetch]               Override fetch (for tests/proxies).
 * @property {(ms:number)=>Promise<void>} [sleep] Override sleep (for tests).
 * @property {() => number} [now]                 Clock override (for tests).
 */

/**
 * @param {ClientOptions} options
 */
export function createClient(options) {
  if (!options || typeof options !== 'object') {
    throw new SiigoConfigError('createClient requires an options object');
  }
  if (!options.username) {
    throw new SiigoConfigError('createClient: `username` is required');
  }
  if (!options.accessKey) {
    throw new SiigoConfigError('createClient: `accessKey` is required');
  }

  const baseUrl = stripTrailingSlash(options.baseUrl || DEFAULT_BASE_URL);
  const authUrl = options.authUrl || deriveAuthUrl(baseUrl);

  const http = createHttpClient({
    userAgent: options.userAgent,
    partnerId: options.partnerId,
    timeoutMs: options.timeoutMs,
    maxRetries: options.maxRetries,
    baseDelayMs: options.baseDelayMs,
    maxDelayMs: options.maxDelayMs,
    retryStatuses: options.retryStatuses,
    fetch: options.fetch,
    sleep: options.sleep,
  });

  const tokens = createTokenProvider({
    username: options.username,
    accessKey: options.accessKey,
    authUrl,
    httpClient: http,
    renewMarginMs: options.renewMarginMs,
    now: options.now,
  });

  async function authorizedRequest(req) {
    const token = await tokens.getToken();
    try {
      return await http.request({
        ...req,
        headers: { Authorization: `Bearer ${token}`, ...(req.headers || {}) },
      });
    } catch (err) {
      // One automatic retry on auth failure: the token might have been revoked
      // mid-flight. Force a refresh and retry exactly once.
      if (err && err.name === 'SiigoAuthError' && !req._retriedAfterAuth) {
        tokens.invalidate();
        const fresh = await tokens.getToken({ forceRefresh: true });
        return http.request({
          ...req,
          _retriedAfterAuth: true,
          headers: { Authorization: `Bearer ${fresh}`, ...(req.headers || {}) },
        });
      }
      throw err;
    }
  }

  function buildUrl(path, params) {
    const base = baseUrl.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${base}${cleanPath}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null || v === '') continue;
        url.searchParams.append(k, String(v));
      }
    }
    return url.toString();
  }

  const api = {
    get(path, { params, headers, signal } = {}) {
      return authorizedRequest({ method: 'GET', url: buildUrl(path, params), headers, signal });
    },
    post(path, body, { params, headers, signal } = {}) {
      return authorizedRequest({
        method: 'POST',
        url: buildUrl(path, params),
        body,
        headers,
        signal,
      });
    },
    put(path, body, { params, headers, signal } = {}) {
      return authorizedRequest({
        method: 'PUT',
        url: buildUrl(path, params),
        body,
        headers,
        signal,
      });
    },
    patch(path, body, { params, headers, signal } = {}) {
      return authorizedRequest({
        method: 'PATCH',
        url: buildUrl(path, params),
        body,
        headers,
        signal,
      });
    },
    delete(path, { params, headers, signal } = {}) {
      return authorizedRequest({
        method: 'DELETE',
        url: buildUrl(path, params),
        headers,
        signal,
      });
    },
    async *paginate(path, { params = {}, pageSize = DEFAULT_PAGE_SIZE, signal } = {}) {
      let page = 1;
      while (page <= PAGINATION_SAFETY_PAGES) {
        const resp = await api.get(path, {
          params: { ...params, page, page_size: pageSize },
          signal,
        });
        const items = Array.isArray(resp) ? resp : Array.isArray(resp?.results) ? resp.results : [];
        for (const item of items) yield item;

        const total = resp?.pagination?.total_results;
        if (Number.isFinite(total)) {
          if (page * pageSize >= total) return;
        } else if (items.length < pageSize) {
          return;
        }
        page += 1;
      }
    },
    async collect(path, options) {
      const out = [];
      for await (const item of api.paginate(path, options)) out.push(item);
      return out;
    },
  };

  const client = {
    baseUrl,
    authUrl,
    api,
    tokens,
    http,
  };

  // Resource namespaces will be attached by `registerResource()` once we
  // implement them (customers, invoices, products, vouchers, ...).

  return client;
}

/**
 * Helper for resource modules to attach themselves to a client.
 *
 *   import { registerResource } from 'siigo-cliente-node/internal';
 *   registerResource(client, 'customers', factory);
 */
export function registerResource(client, name, factory) {
  if (!client || typeof client !== 'object') {
    throw new SiigoConfigError('registerResource: invalid client');
  }
  if (!name || typeof name !== 'string') {
    throw new SiigoConfigError('registerResource: name must be a non-empty string');
  }
  if (typeof factory !== 'function') {
    throw new SiigoConfigError('registerResource: factory must be a function');
  }
  if (name in client) {
    throw new SiigoConfigError(`registerResource: "${name}" is already attached`);
  }
  Object.defineProperty(client, name, {
    value: factory(client.api),
    enumerable: true,
    writable: false,
  });
  return client;
}

function deriveAuthUrl(baseUrl) {
  // Siigo's /auth lives at the host root (not under /v1).
  // Strip a trailing `/v1` if present.
  return `${baseUrl.replace(/\/v\d+$/, '')}/auth`;
}

function stripTrailingSlash(url) {
  return url.replace(/\/+$/, '');
}
