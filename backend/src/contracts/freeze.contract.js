/**
 * @file src/contracts/freeze.contract.js
 *
 * CONTRACT — DevOps freeze module interface
 * ===========================================================================
 * This file defines EXACTLY what the DevOps developer must implement to
 * integrate the IAM/bucket freeze capability.
 * It also ships a working STUB so the pipeline runs end-to-end today.
 *
 * HOW TO SWAP IN THE REAL MODULE
 * --------------------------------
 * 1. DevOps creates their module (e.g. src/freeze/index.js) that exports
 *    `freezeAccount` and `unfreezeAccount` with the same signatures.
 * 2. In src/response/freezeClient.js, change the one import line:
 *       import * as freeze from '../contracts/freeze.contract.js';
 *    becomes:
 *       import * as freeze from '../freeze/index.js';
 *    Nothing else changes.
 *
 * REAL IMPLEMENTATION REQUIREMENTS (for DevOps)
 * -----------------------------------------------
 * freezeAccount(accountId):
 *   - Attach an IAM deny-all policy (or equivalent) to the cloud account/bucket.
 *   - The policy must block ALL writes, deletes, and overwrites.
 *   - Read access for the recovery process must remain intact.
 *   - Must be idempotent: freezing an already-frozen account is a no-op.
 *   - Must complete within 10 seconds (detection SLA requirement).
 *   - Return { frozen: true, at: <ISO timestamp> } on success.
 *   - Throw ExternalServiceError on failure (caller will retry).
 *
 * unfreezeAccount(accountId):
 *   - Remove the deny-all policy, restoring normal access.
 *   - Must be idempotent.
 *   - Return { unfrozen: true, at: <ISO timestamp> } on success.
 *
 * STUB BEHAVIOUR
 * ---------------
 * - Both functions succeed immediately with fake timestamps.
 * - A set of "accountIds" that are currently "frozen" is maintained in-memory
 *   to allow integration tests to assert idempotency.
 * ===========================================================================
 */

import logger from '../utils/logger.js';
import { nowISO } from '../utils/time.js';

/** @type {Set<string>} STUB — in-memory frozen account registry. */
const _frozenAccounts = new Set();

// ---------------------------------------------------------------------------
// freezeAccount
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} FreezeResult
 * @property {boolean} frozen  - Always true on success.
 * @property {string}  at      - ISO-8601 UTC timestamp of when the freeze took effect.
 */

/**
 * Freeze a cloud account/bucket to prevent further writes.
 *
 * CONTRACT (real implementation must match):
 *   - Must be idempotent.
 *   - Must complete within 10 s.
 *   - Must throw ExternalServiceError on failure (so the caller can retry).
 *   - Must return FreezeResult on success.
 *
 * @param {string} accountId  Unique identifier of the cloud account to freeze.
 * @returns {Promise<FreezeResult>}
 */
export async function freezeAccount(accountId) {
  // STUB — fake IAM freeze. Replace with real cloud SDK call.
  if (_frozenAccounts.has(accountId)) {
    logger.info({ accountId }, 'freeze.stub: account already frozen (idempotent no-op)');
  } else {
    _frozenAccounts.add(accountId);
    logger.warn({ accountId }, 'freeze.stub: STUB freeze applied — no real IAM policy set');
  }
  return { frozen: true, at: nowISO() };
}

// ---------------------------------------------------------------------------
// unfreezeAccount
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} UnfreezeResult
 * @property {boolean} unfrozen  - Always true on success.
 * @property {string}  at        - ISO-8601 UTC timestamp of when the unfreeze took effect.
 */

/**
 * Remove the freeze policy from a cloud account/bucket.
 *
 * CONTRACT (real implementation must match):
 *   - Must be idempotent.
 *   - Must throw ExternalServiceError on failure.
 *   - Must return UnfreezeResult on success.
 *
 * @param {string} accountId  Account to unfreeze.
 * @returns {Promise<UnfreezeResult>}
 */
export async function unfreezeAccount(accountId) {
  // STUB — fake IAM unfreeze.
  if (_frozenAccounts.has(accountId)) {
    _frozenAccounts.delete(accountId);
    logger.info({ accountId }, 'freeze.stub: account unfrozen');
  } else {
    logger.info({ accountId }, 'freeze.stub: account was not frozen (idempotent no-op)');
  }
  return { unfrozen: true, at: nowISO() };
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Check whether an account is currently frozen (for tests only).
 * @param {string} accountId
 * @returns {boolean}
 */
export function _isFrozenForTests(accountId) {
  return _frozenAccounts.has(accountId);
}

/**
 * Clear the frozen-accounts registry (for tests only).
 * @returns {void}
 */
export function _resetFreezeStateForTests() {
  _frozenAccounts.clear();
}
