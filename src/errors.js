/**
 * Typed error hierarchy for siigo-cliente-node.
 *
 * Every error thrown by the SDK is an instance of `SiigoError` or one of its
 * subclasses. Catch them by type, never by string matching on `.message`.
 */

export class SiigoError extends Error {
  constructor(message, { cause, status, code, response } = {}) {
    super(message);
    this.name = 'SiigoError';
    if (cause !== undefined) this.cause = cause;
    if (status !== undefined) this.status = status;
    if (code !== undefined) this.code = code;
    if (response !== undefined) this.response = response;
  }
}

export class SiigoAuthError extends SiigoError {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'SiigoAuthError';
  }
}

export class SiigoRateLimitError extends SiigoError {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'SiigoRateLimitError';
    this.retryAfterMs = options.retryAfterMs ?? null;
  }
}

export class SiigoValidationError extends SiigoError {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'SiigoValidationError';
    this.errors = options.errors ?? [];
  }
}

export class SiigoNotFoundError extends SiigoError {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'SiigoNotFoundError';
  }
}

export class SiigoNetworkError extends SiigoError {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'SiigoNetworkError';
  }
}

export class SiigoConfigError extends SiigoError {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'SiigoConfigError';
  }
}

export function classifyHttpError(status, body, response) {
  const message = extractMessage(body) || `Siigo API responded with status ${status}`;
  const opts = { status, response, code: extractCode(body) };

  if (status === 401 || status === 403) {
    return new SiigoAuthError(message, opts);
  }
  if (status === 404) {
    return new SiigoNotFoundError(message, opts);
  }
  if (status === 422 || status === 400) {
    return new SiigoValidationError(message, { ...opts, errors: extractErrors(body) });
  }
  if (status === 429) {
    return new SiigoRateLimitError(message, opts);
  }
  return new SiigoError(message, opts);
}

function extractMessage(body) {
  if (!body || typeof body !== 'object') return null;
  if (typeof body.Message === 'string') return body.Message;
  if (typeof body.message === 'string') return body.message;
  if (Array.isArray(body.Errors) && body.Errors[0]?.Message) return body.Errors[0].Message;
  return null;
}

function extractCode(body) {
  if (!body || typeof body !== 'object') return undefined;
  if (typeof body.Code === 'string') return body.Code;
  if (typeof body.code === 'string') return body.code;
  return undefined;
}

function extractErrors(body) {
  if (!body || typeof body !== 'object') return [];
  if (Array.isArray(body.Errors)) return body.Errors;
  if (Array.isArray(body.errors)) return body.errors;
  return [];
}
