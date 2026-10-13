/**
 * @file src/monitor/eventSource.js
 *
 * Event source interface and polling implementation.
 * Designed so a future webhook event source (e.g. S3 SNS/SQS or Supabase webhooks)
 * can be plugged in without changing the monitor agent.
 *
 * ---------------------------------------------------------------------------
 * INTERFACE EventSource
 * ---------------------------------------------------------------------------
 * @typedef {Object} RawChangeEvent
 * @property {string} bucket       - Bucket name.
 * @property {string} path         - Object path inside bucket.
 * @property {'created'|'modified'|'deleted'} event_type - Change type.
 * @property {string} [account_id] - Cloud account owner.
 *
 * @typedef {Object} EventSource
 * @property {() => Promise<RawChangeEvent[]>} poll - Check for new changes.
 * @property {() => void} resetState                - Reset internal cache.
 */

import logger from '../utils/logger.js';

/**
 * Polling-based EventSource that compares storage entries against an in-memory cache.
 * @implements {EventSource}
 */
export class PollingEventSource {
  /**
   * @param {import('../adapters/storage/index.js').StorageAdapter} storage
   * @param {string} bucket
   * @param {string} [accountId='default-account']
   */
  constructor(storage, bucket, accountId = 'default-account') {
    this._storage = storage;
    this._bucket = bucket;
    this._accountId = accountId;
    /** @type {Map<string, { etag: string, size: number, updatedAt: string }>} */
    this._lastState = new Map();
    this._isFirstRun = true;
  }

  /**
   * Seed the state without emitting change events (useful at startup).
   * @param {Array<{ path: string, etag: string, size: number, updatedAt: string }>} initialEntries
   */
  seedState(initialEntries) {
    this._lastState.clear();
    for (const e of initialEntries) {
      this._lastState.set(e.path, { etag: e.etag, size: e.size, updatedAt: e.updatedAt });
    }
    this._isFirstRun = false;
  }

  /**
   * Poll storage and determine created, modified, and deleted files.
   * @returns {Promise<RawChangeEvent[]>}
   */
  async poll() {
    /** @type {RawChangeEvent[]>} */
    const events = [];

    const currentEntries = await this._storage.list(this._bucket);
    const currentPaths = new Set();

    // If first run and state has not been explicitly seeded, initialise the baseline state
    if (this._isFirstRun) {
      for (const entry of currentEntries) {
        this._lastState.set(entry.path, {
          etag: entry.etag,
          size: entry.size,
          updatedAt: entry.updatedAt,
        });
      }
      this._isFirstRun = false;
      logger.debug(
        { bucket: this._bucket, fileCount: currentEntries.length },
        'eventSource: initial state seeded on first run'
      );
      return events;
    }

    // Detect created and modified files
    for (const entry of currentEntries) {
      currentPaths.add(entry.path);
      const prev = this._lastState.get(entry.path);

      if (!prev) {
        // Created
        events.push({
          bucket: this._bucket,
          path: entry.path,
          event_type: 'created',
          account_id: this._accountId,
        });
        this._lastState.set(entry.path, {
          etag: entry.etag,
          size: entry.size,
          updatedAt: entry.updatedAt,
        });
      } else if (
        prev.etag !== entry.etag ||
        prev.size !== entry.size ||
        prev.updatedAt !== entry.updatedAt
      ) {
        // Modified
        events.push({
          bucket: this._bucket,
          path: entry.path,
          event_type: 'modified',
          account_id: this._accountId,
        });
        this._lastState.set(entry.path, {
          etag: entry.etag,
          size: entry.size,
          updatedAt: entry.updatedAt,
        });
      }
    }

    // Detect deleted files
    for (const [knownPath] of this._lastState.entries()) {
      if (!currentPaths.has(knownPath)) {
        events.push({
          bucket: this._bucket,
          path: knownPath,
          event_type: 'deleted',
          account_id: this._accountId,
        });
        this._lastState.delete(knownPath);
      }
    }

    if (events.length > 0) {
      logger.info({ bucket: this._bucket, count: events.length }, 'eventSource: changes detected');
    }

    return events;
  }

  /**
   * Reset in-memory tracking state.
   */
  resetState() {
    this._lastState.clear();
    this._isFirstRun = true;
  }
}
