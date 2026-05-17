/**
 * Token provider for the Siigo REST API.
 *
 * Siigo exposes `POST {host}/auth` accepting `{ username, access_key }` and
 * returning `{ access_token, expires_in }`. The token is then sent on every
 * subsequent request as `Authorization: Bearer <token>`.
 *
 * This module:
 *   - Caches the token in memory until it expires.
 *   - Renews proactively `renewMarginMs` before expiry (default 5 min).
 *   - Serialises concurrent renewals: parallel callers share one fetch.
 */

import { SiigoAuthError, SiigoConfigError } from './errors.js';

const DEFAULT_RENEW_MARGIN_MS = 5 * 60 * 1000;
const DEFAULT_FALLBACK_TTL_MS = 60 * 60 * 1000;

/**
 * @typedef {Object} TokenProviderOptions
 * @property {string} username                  Siigo API username (email).
 * @property {string} accessKey                 Siigo API access key.
 * @property {string} authUrl                   Full URL to the `/auth` endpoint.
 * @property {{ request:Function }} httpClient  Instance from createHttpClient.
 * @property {number} [renewMarginMs]           How early to renew. Default 300_000.
 * @property {() => number} [now]               Clock override for tests.
 */

/**
 * @param {TokenProviderOptions} options
 */
export function createTokenProvider(options) {
  if (!options || typeof options !== 'object') {
    throw new SiigoConfigError('createTokenProvider requires an options object');
  }
  if (!options.username) {
    throw new SiigoConfigError('createTokenProvider: `username` is required');
  }
  if (!options.accessKey) {
    throw new SiigoConfigError('createTokenProvider: `accessKey` is required');
  }
  if (!options.authUrl) {
    throw new SiigoConfigError('createTokenProvider: `authUrl` is required');
  }
  if (!options.httpClient || typeof options.httpClient.request !== 'function') {
    throw new SiigoConfigError('createTokenProvider: `httpClient` is required');
  }

  const config = {
    username: options.username,
    accessKey: options.accessKey,
    authUrl: options.authUrl,
    httpClient: options.httpClient,
    renewMarginMs: options.renewMarginMs ?? DEFAULT_RENEW_MARGIN_MS,
    now: options.now ?? Date.now,
  };

  let cached = null;
  let inflight = null;

  async function getToken({ forceRefresh = false } = {}) {
    const now = config.now();
    if (!forceRefresh && cached && now < cached.expiresAt) {
      return cached.token;
    }
    if (inflight) return inflight;

    inflight = fetchToken().finally(() => {
      inflight = null;
    });
    return inflight;
  }

  async function fetchToken() {
    let body;
    try {
      body = await config.httpClient.request({
        method: 'POST',
        url: config.authUrl,
        body: {
          username: config.username,
          access_key: config.accessKey,
        },
        retryOnRateLimit: true,
      });
    } catch (err) {
      if (err instanceof SiigoAuthError) throw err;
      throw new SiigoAuthError(
        `Siigo authentication failed: ${err.message}`,
        { cause: err, status: err.status, response: err.response }
      );
    }

    if (!body || typeof body.access_token !== 'string' || !body.access_token) {
      throw new SiigoAuthError(
        'Siigo authentication response did not include an access_token',
        { response: body }
      );
    }

    const ttlSeconds = Number.isFinite(body.expires_in) && body.expires_in > 0
      ? body.expires_in
      : DEFAULT_FALLBACK_TTL_MS / 1000;
    const ttlMs = ttlSeconds * 1000;
    const expiresAt = config.now() + Math.max(ttlMs - config.renewMarginMs, 0);

    cached = { token: body.access_token, expiresAt };
    return cached.token;
  }

  function invalidate() {
    cached = null;
  }

  function peek() {
    return cached ? { token: cached.token, expiresAt: cached.expiresAt } : null;
  }

  return { getToken, invalidate, peek };
}
