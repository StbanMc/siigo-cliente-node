/**
 * Low-level HTTP transport for siigo-cliente-node.
 *
 * Zero dependencies. Built on Node 18+ `fetch` and `AbortController`.
 * Retries idempotent failures (429, 502, 503, 504) with exponential backoff,
 * honouring `Retry-After` when present.
 */

import {
  SiigoNetworkError,
  SiigoRateLimitError,
  classifyHttpError,
} from './errors.js';

const DEFAULT_RETRY_STATUSES = [429, 502, 503, 504];
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1500;
const DEFAULT_MAX_DELAY_MS = 30_000;
const DEFAULT_TIMEOUT_MS = 60_000;

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * @typedef {Object} HttpClientOptions
 * @property {string} [userAgent]            UA string sent on every request.
 * @property {string} [partnerId]            Value for the `Partner-Id` Siigo header.
 * @property {number} [timeoutMs]            Per-request timeout. Default 60_000.
 * @property {number} [maxRetries]           Max retry attempts. Default 3.
 * @property {number} [baseDelayMs]          Base for exponential backoff. Default 1500.
 * @property {number} [maxDelayMs]           Upper cap for backoff. Default 30_000.
 * @property {number[]} [retryStatuses]      HTTP statuses to retry. Default [429,502,503,504].
 * @property {typeof fetch} [fetch]          Override fetch (testing / proxy).
 * @property {(ms:number)=>Promise<void>} [sleep]  Override sleep (testing).
 * @property {boolean} [retryOnPostRateLimit]  If true, retry POST/PUT/PATCH on 429. Default true.
 */

/**
 * @param {HttpClientOptions} [options]
 */
export function createHttpClient(options = {}) {
  const config = {
    userAgent: options.userAgent || 'siigo-cliente-node/0.1.0 (+https://github.com/StbanMc/siigo-cliente-node)',
    partnerId: options.partnerId || 'siigo-cliente-node',
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
    baseDelayMs: options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS,
    maxDelayMs: options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS,
    retryStatuses: options.retryStatuses ?? DEFAULT_RETRY_STATUSES,
    fetch: options.fetch ?? globalThis.fetch,
    sleep: options.sleep ?? defaultSleep,
    retryOnPostRateLimit: options.retryOnPostRateLimit ?? true,
  };

  if (typeof config.fetch !== 'function') {
    throw new TypeError(
      'siigo-cliente-node requires global fetch (Node >= 18) or an explicit `fetch` option.'
    );
  }

  /**
   * Send an HTTP request and parse the JSON response.
   *
   * @param {Object}  req
   * @param {string}  req.method
   * @param {string}  req.url
   * @param {Object}  [req.headers]
   * @param {*}       [req.body]               JSON-serialisable body, or null.
   * @param {AbortSignal} [req.signal]         External signal to cancel.
   * @param {boolean} [req.retryOnRateLimit]   Override per-request.
   * @returns {Promise<*>}
   */
  async function request(req) {
    const method = (req.method || 'GET').toUpperCase();
    const isSafe = SAFE_METHODS.has(method);
    const allowRateLimitRetry =
      req.retryOnRateLimit !== undefined
        ? req.retryOnRateLimit
        : isSafe || config.retryOnPostRateLimit;

    const headers = {
      Accept: 'application/json',
      'User-Agent': config.userAgent,
      'Partner-Id': config.partnerId,
      ...(req.headers || {}),
    };

    let body;
    if (req.body !== undefined && req.body !== null) {
      if (typeof req.body === 'string' || req.body instanceof Uint8Array) {
        body = req.body;
      } else {
        body = JSON.stringify(req.body);
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/json';
        }
      }
    }

    let attempt = 0;
    let lastError;
    while (attempt <= config.maxRetries) {
      const ac = new AbortController();
      const externalAbort = req.signal
        ? onAbort(req.signal, () => ac.abort(req.signal.reason))
        : null;
      const timer = setTimeout(() => ac.abort(new Error('Request timed out')), config.timeoutMs);

      let response;
      try {
        response = await config.fetch(req.url, {
          method,
          headers,
          body,
          signal: ac.signal,
        });
      } catch (err) {
        clearTimeout(timer);
        externalAbort?.();
        if (isAbortError(err) && req.signal?.aborted) {
          throw err;
        }
        lastError = new SiigoNetworkError(
          `Network error calling ${method} ${req.url}: ${err.message}`,
          { cause: err }
        );
        if (!isSafe || attempt >= config.maxRetries) throw lastError;
        await config.sleep(computeBackoff(attempt, config));
        attempt += 1;
        continue;
      }

      clearTimeout(timer);
      externalAbort?.();

      const { status } = response;
      const parsed = await parseResponseBody(response);

      if (status >= 200 && status < 300) {
        return parsed;
      }

      const isRetryableStatus = config.retryStatuses.includes(status);
      const canRetry =
        isRetryableStatus &&
        attempt < config.maxRetries &&
        (status !== 429 ? isSafe : allowRateLimitRetry) &&
        (isSafe || isRetryableStatus);

      if (canRetry) {
        const retryAfterMs = parseRetryAfter(response.headers.get('retry-after'));
        const delay = retryAfterMs ?? computeBackoff(attempt, config);
        await config.sleep(delay);
        attempt += 1;
        continue;
      }

      if (status === 429) {
        throw new SiigoRateLimitError(
          extractRateLimitMessage(parsed) || 'Siigo API rate limit exceeded',
          {
            status,
            response,
            retryAfterMs: parseRetryAfter(response.headers.get('retry-after')),
          }
        );
      }

      throw classifyHttpError(status, parsed, response);
    }

    throw lastError ?? new SiigoNetworkError(`Exhausted ${config.maxRetries} retries for ${method} ${req.url}`);
  }

  return { request, config };
}

function computeBackoff(attempt, config) {
  const exp = config.baseDelayMs * 2 ** attempt;
  const capped = Math.min(exp, config.maxDelayMs);
  const jitter = Math.floor(Math.random() * Math.min(capped * 0.25, 1000));
  return capped + jitter;
}

function parseRetryAfter(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return null;
}

async function parseResponseBody(response) {
  const status = response.status;
  if (status === 204 || status === 205) return null;

  const text = await response.text();
  if (!text) return null;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json') || contentType.includes('+json')) {
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function extractRateLimitMessage(body) {
  if (!body || typeof body !== 'object') return null;
  return body.Message || body.message || null;
}

function isAbortError(err) {
  return err && (err.name === 'AbortError' || err.code === 'ABORT_ERR');
}

function onAbort(signal, listener) {
  if (signal.aborted) {
    listener();
    return () => {};
  }
  signal.addEventListener('abort', listener, { once: true });
  return () => signal.removeEventListener('abort', listener);
}

function defaultSleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
