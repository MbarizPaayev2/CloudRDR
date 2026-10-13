/**
 * @file src/utils/errors.js
 * Custom error classes for CloudRDR.
 * All modules must throw one of these — never swallow exceptions.
 */

/**
 * Base class for all CloudRDR errors.
 * Carries a machine-readable `code` so API handlers can map to HTTP status.
 */
export class CloudRdrError extends Error {
  /**
   * @param {string} message   Human-readable description.
   * @param {string} code      Snake_case machine code (e.g. 'not_found').
   * @param {unknown} [cause]  Original error that triggered this one.
   */
  constructor(message, code, cause) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    if (cause) this.cause = cause;
  }
}

/** Requested resource does not exist. HTTP 404. */
export class NotFoundError extends CloudRdrError {
  constructor(message, cause) {
    super(message, 'not_found', cause);
  }
}

/** Input validation failed. HTTP 400. */
export class ValidationError extends CloudRdrError {
  constructor(message, cause) {
    super(message, 'validation_error', cause);
  }
}

/** External service (storage, Supabase, freeze API) returned an error. HTTP 502. */
export class ExternalServiceError extends CloudRdrError {
  constructor(message, cause) {
    super(message, 'external_service_error', cause);
  }
}

/** Operation is not allowed given current state. HTTP 409. */
export class ConflictError extends CloudRdrError {
  constructor(message, cause) {
    super(message, 'conflict', cause);
  }
}

/** Crypto or integrity check failed. HTTP 422. */
export class IntegrityError extends CloudRdrError {
  constructor(message, cause) {
    super(message, 'integrity_error', cause);
  }
}

/** Account is frozen; operation cannot proceed. HTTP 403. */
export class AccountFrozenError extends CloudRdrError {
  constructor(message, cause) {
    super(message, 'account_frozen', cause);
  }
}

/**
 * Map a CloudRdrError code to an HTTP status code.
 * @param {string} code
 * @returns {number}
 */
export function httpStatusForCode(code) {
  const map = {
    not_found: 404,
    validation_error: 400,
    external_service_error: 502,
    conflict: 409,
    integrity_error: 422,
    account_frozen: 403,
  };
  return map[code] ?? 500;
}
