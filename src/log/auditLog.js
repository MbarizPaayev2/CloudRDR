/**
 * @file src/log/auditLog.js
 *
 * Hash-Chained Audit Log for CloudRDR.
 * Implements an immutable, append-only tamper-evident audit ledger.
 *
 * Each block:
 *   hash = SHA-256(index : prevHash : timestamp : canonicalJson(data))
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { canonicalJson } from '../crypto/ed25519.js';
import logger from '../utils/logger.js';
import { nowISO } from '../utils/time.js';

const GENESIS_PREV_HASH = '0'.repeat(64);

/**
 * @typedef {Object} AuditBlock
 * @property {number} index
 * @property {string} prevHash
 * @property {string} timestamp
 * @property {unknown} data
 * @property {string} hash
 */

export class AuditLog {
  /**
   * @param {Object} [options]
   * @param {string} [options.logFilePath] Path to jsonl log file (optional; in-memory if null)
   */
  constructor(options = {}) {
    this.logFilePath = options.logFilePath || null;
    /** @type {AuditBlock[]} */
    this.entries = [];
    this._initialized = false;
  }

  /**
   * Initialise the ledger from disk if a file path is configured.
   */
  async init() {
    if (this._initialized) return;

    if (this.logFilePath) {
      try {
        await fs.mkdir(path.dirname(this.logFilePath), { recursive: true });
        if (fsSync.existsSync(this.logFilePath)) {
          const content = await fs.readFile(this.logFilePath, 'utf8');
          const lines = content.split('\n').filter((l) => l.trim().length > 0);
          this.entries = lines.map((line) => JSON.parse(line));
          logger.info(
            { count: this.entries.length },
            'auditLog: loaded existing log entries from disk'
          );
        }
      } catch (err) {
        logger.error(
          { err: err.message },
          'auditLog: failed to initialize log file, starting empty'
        );
      }
    }

    this._initialized = true;
  }

  /**
   * Compute the cryptographic hash of an audit block.
   * @param {number} index
   * @param {string} prevHash
   * @param {string} timestamp
   * @param {unknown} data
   * @returns {string}
   */
  static computeBlockHash(index, prevHash, timestamp, data) {
    const canonical = canonicalJson(data);
    const payload = `${index}:${prevHash}:${timestamp}:${canonical}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Append an entry to the hash-chain.
   * @param {unknown} data
   * @returns {Promise<AuditBlock>}
   */
  async append(data) {
    await this.init();

    const index = this.entries.length;
    const prevHash = index === 0 ? GENESIS_PREV_HASH : this.entries[index - 1].hash;
    const timestamp = nowISO();
    const hash = AuditLog.computeBlockHash(index, prevHash, timestamp, data);

    const block = {
      index,
      prevHash,
      timestamp,
      data,
      hash,
    };

    this.entries.push(block);

    // Persist to disk if log file is configured
    if (this.logFilePath) {
      try {
        await fs.appendFile(this.logFilePath, JSON.stringify(block) + '\n', 'utf8');
      } catch (err) {
        logger.error({ err: err.message }, 'auditLog: failed to write block to disk');
      }
    }

    logger.debug({ index, hash: hash.slice(0, 16) + '...' }, 'auditLog: block appended');
    return block;
  }

  /**
   * Retrieve all blocks currently in the ledger.
   * @returns {AuditBlock[]}
   */
  getEntries() {
    return [...this.entries];
  }

  /**
   * Clear in-memory entries (for test isolation).
   */
  clear() {
    this.entries = [];
    this._initialized = false;
    if (this.logFilePath && fsSync.existsSync(this.logFilePath)) {
      try {
        fsSync.unlinkSync(this.logFilePath);
      } catch {
        // ignore
      }
    }
  }
}

/** Global singleton audit log instance */
export const defaultAuditLog = new AuditLog({
  logFilePath: './data/audit-log/audit.jsonl',
});
