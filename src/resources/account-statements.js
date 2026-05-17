/**
 * `client.accountStatements` — customer account statements / cartera.
 *
 *   - GET /account-statement       → list / paginate (Siigo path is singular)
 *
 * Note: Siigo's path is `/account-statement` (singular) at the time
 * of writing. If your tenant uses a different path, override via
 * the optional `path` argument to `list({ ..., path: '/custom' })`.
 */

const DEFAULT_PATH = '/account-statement';

export function createAccountStatementsResource(api) {
  return {
    list(filters = {}, options = {}) {
      const path = options.path || DEFAULT_PATH;
      return api.collect(path, {
        params: filters,
        signal: options.signal,
        pageSize: options.pageSize,
      });
    },
    paginate(filters = {}, options = {}) {
      const path = options.path || DEFAULT_PATH;
      return api.paginate(path, {
        params: filters,
        signal: options.signal,
        pageSize: options.pageSize,
      });
    },
  };
}
