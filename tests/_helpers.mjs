// Shared test helpers. Not part of the package — never published.

import { createClient } from '../src/index.js';

export function makeMockFetch(responses) {
  let i = 0;
  const calls = [];
  async function mockFetch(url, init) {
    calls.push({ url, init });
    const next = responses[i] ?? responses[responses.length - 1];
    i += 1;
    if (next.throw) throw next.throw;
    return {
      status: next.status ?? 200,
      headers: {
        get(name) {
          const map = next.headers || {};
          return map[name.toLowerCase()] ?? map[name] ?? null;
        },
      },
      text: async () => {
        if (next.body === undefined) return '';
        if (typeof next.body === 'string') return next.body;
        return JSON.stringify(next.body);
      },
    };
  }
  mockFetch.calls = calls;
  return mockFetch;
}

/**
 * Convenience: build a client with sleep stubbed (no real backoff in tests).
 * Resources come pre-attached from createClient itself.
 */
export function createSiigoClientWithResources(options = {}) {
  return createClient({
    username: options.username || 'u@example.com',
    accessKey: options.accessKey || 'test-key',
    fetch: options.fetch,
    sleep: options.sleep ?? (async () => {}),
    baseUrl: options.baseUrl,
    now: options.now,
  });
}
