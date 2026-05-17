// Type definitions for siigo-cliente-node
// Project: https://github.com/StbanMc/siigo-cliente-node
//
// These types describe the SDK surface. Payload shapes for Siigo
// resources (Customer, Invoice, Product, …) are intentionally loose
// (`Record<string, any>`) because Siigo's API evolves and the SDK
// stays out of validating request bodies; the caller passes what
// Siigo accepts and validation errors surface as `SiigoValidationError`.

// =============================================================================
// Errors
// =============================================================================

export interface SiigoErrorOptions {
  cause?: unknown;
  status?: number;
  code?: string;
  response?: unknown;
}

export class SiigoError extends Error {
  status?: number;
  code?: string;
  response?: unknown;
  cause?: unknown;
  constructor(message: string, options?: SiigoErrorOptions);
}

export class SiigoAuthError extends SiigoError {}

export class SiigoRateLimitError extends SiigoError {
  retryAfterMs: number | null;
}

export interface SiigoErrorEntry {
  Code?: string;
  Message?: string;
  Params?: string[];
  [key: string]: unknown;
}

export class SiigoValidationError extends SiigoError {
  errors: SiigoErrorEntry[];
}

export class SiigoNotFoundError extends SiigoError {}
export class SiigoNetworkError extends SiigoError {}
export class SiigoConfigError extends SiigoError {}

// =============================================================================
// Client configuration
// =============================================================================

export interface ClientOptions {
  username: string;
  accessKey: string;
  baseUrl?: string;
  authUrl?: string;
  partnerId?: string;
  userAgent?: string;
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryStatuses?: number[];
  renewMarginMs?: number;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export interface RequestOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export interface ListOptions extends RequestOptions {
  pageSize?: number;
}

// =============================================================================
// Low-level API surface
// =============================================================================

export interface ApiSurface {
  get<T = any>(path: string, options?: RequestOptions & { params?: Record<string, unknown> }): Promise<T>;
  post<T = any>(path: string, body: unknown, options?: RequestOptions & { params?: Record<string, unknown> }): Promise<T>;
  put<T = any>(path: string, body: unknown, options?: RequestOptions & { params?: Record<string, unknown> }): Promise<T>;
  patch<T = any>(path: string, body: unknown, options?: RequestOptions & { params?: Record<string, unknown> }): Promise<T>;
  delete<T = any>(path: string, options?: RequestOptions & { params?: Record<string, unknown> }): Promise<T>;
  paginate<T = any>(path: string, options?: ListOptions & { params?: Record<string, unknown> }): AsyncIterableIterator<T>;
  collect<T = any>(path: string, options?: ListOptions & { params?: Record<string, unknown> }): Promise<T[]>;
}

export interface TokenInfo {
  token: string;
  expiresAt: number;
}

export interface TokenProvider {
  getToken(options?: { forceRefresh?: boolean }): Promise<string>;
  invalidate(): void;
  peek(): TokenInfo | null;
}

export interface HttpClient {
  request(req: {
    method?: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    signal?: AbortSignal;
    retryOnRateLimit?: boolean;
  }): Promise<any>;
  config: Required<Pick<ClientOptions, 'userAgent' | 'partnerId' | 'timeoutMs' | 'maxRetries' | 'baseDelayMs' | 'maxDelayMs' | 'retryStatuses'>>;
}

// =============================================================================
// Resources
// =============================================================================

export type SiigoEntity = Record<string, any>;

export interface CustomersResource {
  list(filters?: Record<string, unknown>, options?: ListOptions): Promise<SiigoEntity[]>;
  paginate(filters?: Record<string, unknown>, options?: ListOptions): AsyncIterableIterator<SiigoEntity>;
  getById(id: string | number, options?: RequestOptions): Promise<SiigoEntity>;
  findByIdentification(identification: string, options?: RequestOptions): Promise<SiigoEntity | null>;
  create(body: SiigoEntity, options?: RequestOptions): Promise<SiigoEntity>;
  update(id: string | number, body: SiigoEntity, options?: RequestOptions): Promise<SiigoEntity>;
  delete(id: string | number, options?: RequestOptions): Promise<void>;
}

export interface InvoicesResource {
  list(filters?: Record<string, unknown>, options?: ListOptions): Promise<SiigoEntity[]>;
  paginate(filters?: Record<string, unknown>, options?: ListOptions): AsyncIterableIterator<SiigoEntity>;
  getById(id: string | number, options?: RequestOptions): Promise<SiigoEntity>;
  create(body: SiigoEntity, options?: RequestOptions): Promise<SiigoEntity>;
  stamp(id: string | number, body?: SiigoEntity, options?: RequestOptions): Promise<SiigoEntity>;
  getPdfLink(id: string | number, options?: RequestOptions): Promise<{ url: string; expires_in: number }>;
}

export interface ProductsResource {
  list(filters?: Record<string, unknown>, options?: ListOptions): Promise<SiigoEntity[]>;
  paginate(filters?: Record<string, unknown>, options?: ListOptions): AsyncIterableIterator<SiigoEntity>;
  getById(id: string | number, options?: RequestOptions): Promise<SiigoEntity>;
  findByCode(code: string, options?: RequestOptions): Promise<SiigoEntity | null>;
  create(body: SiigoEntity, options?: RequestOptions): Promise<SiigoEntity>;
  update(id: string | number, body: SiigoEntity, options?: RequestOptions): Promise<SiigoEntity>;
  delete(id: string | number, options?: RequestOptions): Promise<void>;
}

export interface VouchersResource {
  list(filters?: Record<string, unknown>, options?: ListOptions): Promise<SiigoEntity[]>;
  paginate(filters?: Record<string, unknown>, options?: ListOptions): AsyncIterableIterator<SiigoEntity>;
  getById(id: string | number, options?: RequestOptions): Promise<SiigoEntity>;
  create(body: SiigoEntity, options?: RequestOptions): Promise<SiigoEntity>;
}

export interface CreditNotesResource {
  list(filters?: Record<string, unknown>, options?: ListOptions): Promise<SiigoEntity[]>;
  paginate(filters?: Record<string, unknown>, options?: ListOptions): AsyncIterableIterator<SiigoEntity>;
  getById(id: string | number, options?: RequestOptions): Promise<SiigoEntity>;
  create(body: SiigoEntity, options?: RequestOptions): Promise<SiigoEntity>;
}

export interface PaymentsResource {
  list(filters?: Record<string, unknown>, options?: ListOptions): Promise<SiigoEntity[]>;
  paginate(filters?: Record<string, unknown>, options?: ListOptions): AsyncIterableIterator<SiigoEntity>;
  getById(id: string | number, options?: RequestOptions): Promise<SiigoEntity>;
}

export interface AccountStatementsResource {
  list(filters?: Record<string, unknown>, options?: ListOptions & { path?: string }): Promise<SiigoEntity[]>;
  paginate(filters?: Record<string, unknown>, options?: ListOptions & { path?: string }): AsyncIterableIterator<SiigoEntity>;
}

// =============================================================================
// Client
// =============================================================================

export interface SiigoClient {
  readonly baseUrl: string;
  readonly authUrl: string;
  readonly api: ApiSurface;
  readonly tokens: TokenProvider;
  readonly http: HttpClient;
  customers?: CustomersResource;
  invoices?: InvoicesResource;
  products?: ProductsResource;
  vouchers?: VouchersResource;
  creditNotes?: CreditNotesResource;
  payments?: PaymentsResource;
  accountStatements?: AccountStatementsResource;
  [resource: string]: unknown;
}

export function createClient(options: ClientOptions): SiigoClient;

export function registerResource<TName extends string, TResource>(
  client: SiigoClient,
  name: TName,
  factory: (api: ApiSurface) => TResource
): SiigoClient & Record<TName, TResource>;
