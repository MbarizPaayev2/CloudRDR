/**
 * @file src/response/freezeClient.js
 *
 * Client for invoking account and bucket freeze operations.
 * Delegates to the freeze contract stub until DevOps provides the real implementation.
 */

import * as freeze from '../contracts/freeze.contract.js';

/**
 * Freeze an account via the cloud IAM/bucket provider.
 * @param {string} accountId
 * @returns {Promise<{ frozen: boolean, at: string }>}
 */
export async function freezeAccount(accountId) {
  return freeze.freezeAccount(accountId);
}

/**
 * Unfreeze an account.
 * @param {string} accountId
 * @returns {Promise<{ unfrozen: boolean, at: string }>}
 */
export async function unfreezeAccount(accountId) {
  return freeze.unfreezeAccount(accountId);
}
