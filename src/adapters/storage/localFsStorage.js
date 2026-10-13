/**
 * @file src/adapters/storage/localFsStorage.js
 *
 * Local-filesystem StorageAdapter.
 * Mirrors the bucket/path hierarchy under a configurable root directory.
 * Used for offline development, demos, and integration tests — no cloud
 * credentials required.
 *
 * On-disk layout:
 *   <localPath>/<bucket>/<path>
 *
 * Example:
 *   bucket = 'protected', path = 'docs/report.pdf'
 *   => ./data/local-storage/protected/docs/report.pdf
 */

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import nodePath from 'node:path';
import crypto from 'node:crypto';
import { NotFoundError, ExternalServiceError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

/**
 * Local filesystem implementation of StorageAdapter.
 * @implements {import('./index.js').StorageAdapter}
 */
export class LocalFsStorage {
  /**
   * @param {string} rootPath  Absolute or relative path to the storage root.
   */
  constructor(rootPath) {
    /** @private */
    this._root = nodePath.resolve(rootPath);
  }

  /**
   * Resolve the absolute filesystem path for a given bucket + object path.
   * @param {string} bucket
   * @param {string} [objectPath]
   * @returns {string}
   * @private
   */
  _resolve(bucket, objectPath = '') {
    // Prevent path-traversal attacks: reject paths with '..'
    const combined = nodePath.join(bucket, objectPath);
    if (combined.includes('..')) {
      throw new ExternalServiceError(`Path traversal detected: ${objectPath}`);
    }
    return nodePath.join(this._root, combined);
  }

  /**
   * Recursively walk a directory and yield all file paths.
   * @param {string} dir  Absolute directory path.
   * @param {string} base Prefix to strip from results.
   * @returns {Promise<import('./index.js').StorageEntry[]>}
   * @private
   */
  async _walk(dir, base) {
    /** @type {import('./index.js').StorageEntry[]} */
    const entries = [];
    let items;
    try {
      items = await fs.readdir(dir, { withFileTypes: true });
    } catch (err) {
      if (err.code === 'ENOENT') return entries; // empty bucket is fine
      throw new ExternalServiceError(`Failed to list directory ${dir}: ${err.message}`, err);
    }

    for (const item of items) {
      const abs = nodePath.join(dir, item.name);
      if (item.isDirectory()) {
        const sub = await this._walk(abs, base);
        entries.push(...sub);
      } else if (item.isFile()) {
        let stat;
        try {
          stat = await fs.stat(abs);
        } catch (err) {
          logger.warn({ path: abs, err: err.message }, 'local-storage: could not stat file, skipping');
          continue;
        }
        // Compute a cheap content fingerprint for change detection.
        const etag = crypto
          .createHash('md5')
          .update(`${stat.size}:${stat.mtimeMs}`)
          .digest('hex');

        // Strip the base path prefix and normalise separators to forward slashes
        const rel = nodePath.relative(base, abs).split(nodePath.sep).join('/');

        entries.push({
          path: rel,
          size: stat.size,
          etag,
          updatedAt: stat.mtime.toISOString(),
        });
      }
    }
    return entries;
  }

  /**
   * List all objects in `bucket` whose path starts with `prefix`.
   * @param {string} bucket
   * @param {string} [prefix]
   * @returns {Promise<import('./index.js').StorageEntry[]>}
   */
  async list(bucket, prefix = '') {
    const bucketDir = this._resolve(bucket);
    const all = await this._walk(bucketDir, bucketDir);
    if (!prefix) return all;
    return all.filter((e) => e.path.startsWith(prefix));
  }

  /**
   * Read an object and return its content as a Buffer.
   * @param {string} bucket
   * @param {string} path
   * @returns {Promise<Buffer>}
   */
  async read(bucket, path) {
    const abs = this._resolve(bucket, path);
    try {
      return await fs.readFile(abs);
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError(`Object not found: ${bucket}/${path}`, err);
      }
      throw new ExternalServiceError(`Failed to read ${bucket}/${path}: ${err.message}`, err);
    }
  }

  /**
   * Read an object as a Node.js Readable stream.
   * @param {string} bucket
   * @param {string} path
   * @returns {Promise<import('node:stream').Readable>}
   */
  async readStream(bucket, path) {
    const abs = this._resolve(bucket, path);
    try {
      await fs.access(abs);
      return fsSync.createReadStream(abs);
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError(`Object not found: ${bucket}/${path}`, err);
      }
      throw new ExternalServiceError(`Failed to stream ${bucket}/${path}: ${err.message}`, err);
    }
  }

  /**
   * Write data to an object, creating parent directories as needed.
   * @param {string} bucket
   * @param {string} path
   * @param {Buffer | string} data
   * @returns {Promise<void>}
   */
  async write(bucket, path, data) {
    const abs = this._resolve(bucket, path);
    try {
      await fs.mkdir(nodePath.dirname(abs), { recursive: true });
      await fs.writeFile(abs, data);
    } catch (err) {
      throw new ExternalServiceError(`Failed to write ${bucket}/${path}: ${err.message}`, err);
    }
  }

  /**
   * Check if an object exists.
   * @param {string} bucket
   * @param {string} path
   * @returns {Promise<boolean>}
   */
  async exists(bucket, path) {
    const abs = this._resolve(bucket, path);
    try {
      await fs.access(abs);
      return true;
    } catch {
      return false;
    }
  }
}
