/**
 * siigo-cliente-node — public entry point.
 *
 * Usage:
 *
 *   import { createClient } from 'siigo-cliente-node';
 *
 *   const client = createClient({
 *     username: process.env.SIIGO_USERNAME,
 *     accessKey: process.env.SIIGO_ACCESS_KEY,
 *   });
 *
 *   const customer = await client.api.get('/customers/123');
 */

export { createClient, registerResource } from './client.js';
export {
  SiigoError,
  SiigoAuthError,
  SiigoRateLimitError,
  SiigoValidationError,
  SiigoNotFoundError,
  SiigoNetworkError,
  SiigoConfigError,
} from './errors.js';
