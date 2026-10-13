/**
 * @file src/monitor/monitorAgent.js
 *
 * Monitoring Agent for CloudRDR.
 * Polls storage via EventSource, verifies file hashes against the protected baseline,
 * stores events in Postgres, and forwards them to the detection engine.
 */

import cfg from '../config/index.js';
import { getStorageAdapter } from '../adapters/storage/index.js';
import { getSupabaseClient, supaQuery } from '../adapters/db/supabaseClient.js';
import * as crypto from '../contracts/crypto.contract.js';
import { PollingEventSource } from './eventSource.js';
import { evaluateEvents } from '../detection/detectionEngine.js';
import logger from '../utils/logger.js';
import { nowISO } from '../utils/time.js';

export class MonitorAgent {
  /**
   * @param {Object} [options]
   * @param {string} [options.bucket]
   * @param {string} [options.accountId]
   * @param {number} [options.intervalSeconds]
   * @param {import('./eventSource.js').EventSource} [options.eventSource]
   * @param {(events: Array<Object>) => Promise<any>} [options.onEvents]
   */
  constructor(options = {}) {
    this.bucket = options.bucket || cfg.storage.bucket;
    this.accountId = options.accountId || 'default-account';
    this.intervalSeconds = options.intervalSeconds || cfg.monitor.intervalSeconds;
    this.eventSource = options.eventSource || null;
    this.onEvents = options.onEvents || null;

    /** @private */
    this._timer = null;
    /** @private */
    this._running = false;
    /** @private */
    this._cycleInProgress = false;
  }

  /**
   * Initialise the event source if not explicitly provided.
   */
  async _ensureEventSource() {
    if (!this.eventSource) {
      const storage = await getStorageAdapter();
      this.eventSource = new PollingEventSource(storage, this.bucket, this.accountId);
    }
  }

  /**
   * Run one monitoring cycle.
   * Can be invoked directly in tests or scheduled periodically.
   * Does NOT crash on a single failed file.
   *
   * @returns {Promise<Array<Object>>} Array of persisted change events
   */
  async runCycle() {
    if (this._cycleInProgress) return [];
    this._cycleInProgress = true;

    try {
      await this._ensureEventSource();
      const rawEvents = await this.eventSource.poll();
      if (!rawEvents || rawEvents.length === 0) {
        return [];
      }

      const storage = await getStorageAdapter();
      const db = getSupabaseClient();
      const processedEvents = [];

      for (const raw of rawEvents) {
        try {
          let observedSha256 = null;
          let matchedBaseline = false;

          if (raw.event_type !== 'deleted') {
            try {
              const stream = await storage.readStream(raw.bucket, raw.path);
              observedSha256 = await crypto.hashStream(stream);
            } catch (readErr) {
              // Gracefully handle a file that might have been deleted mid-scan or locked
              logger.warn(
                { bucket: raw.bucket, path: raw.path, err: readErr.message },
                'monitorAgent: failed to read file stream, skipping hash'
              );
            }
          }

          // Check against protected_files latest baseline
          if (observedSha256) {
            const baselineRows = await supaQuery(
              db
                .from('protected_files')
                .select('baseline_sha256')
                .eq('bucket', raw.bucket)
                .eq('path', raw.path)
                .order('baseline_version', { ascending: false })
                .limit(1)
            );

            if (baselineRows && baselineRows.length > 0) {
              matchedBaseline = baselineRows[0].baseline_sha256 === observedSha256;
            }
          }

          const eventRow = {
            bucket: raw.bucket,
            path: raw.path,
            account_id: raw.account_id || this.accountId,
            event_type: raw.event_type,
            observed_sha256: observedSha256,
            observed_at: nowISO(),
            matched_baseline: matchedBaseline,
          };

          processedEvents.push(eventRow);
        } catch (itemErr) {
          logger.error(
            { bucket: raw.bucket, path: raw.path, err: itemErr.message },
            'monitorAgent: error processing event for file, continuing with remaining files'
          );
        }
      }

      // Persist to change_events table
      if (processedEvents.length > 0) {
        await supaQuery(db.from('change_events').insert(processedEvents));
        logger.info(
          { count: processedEvents.length },
          'monitorAgent: persisted change events to database'
        );

        // Pass to detection engine
        if (this.onEvents) {
          await this.onEvents(processedEvents);
        } else {
          // Default: evaluate through detection engine
          await evaluateEvents(this.accountId, this.bucket);
        }
      }

      return processedEvents;
    } catch (err) {
      logger.error({ err: err.message }, 'monitorAgent: cycle failed');
      return [];
    } finally {
      this._cycleInProgress = false;
    }
  }

  /**
   * Start periodic polling loop.
   */
  async start() {
    if (this._running) return;
    this._running = true;

    await this._ensureEventSource();
    logger.info(
      { bucket: this.bucket, intervalSeconds: this.intervalSeconds },
      'monitorAgent: started'
    );

    // Initial cycle
    await this.runCycle();

    this._timer = setInterval(async () => {
      if (!this._running) return;
      await this.runCycle();
    }, this.intervalSeconds * 1000);
  }

  /**
   * Stop polling gracefully.
   */
  stop() {
    this._running = false;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    logger.info('monitorAgent: stopped');
  }
}
