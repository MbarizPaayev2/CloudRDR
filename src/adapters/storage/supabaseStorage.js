/**
 * @file src/adapters/storage/supabaseStorage.js
 *
 * Supabase Storage implementation of StorageAdapter.
 * Requires SUPABASE_URL and SUPABASE_SERVICE_KEY to be set.
 *
 * Supabase Storage uses a flat key-value layout inside each bucket.
 * The `list()` method pages through results (max 1 000 per call) to
 * handle buckets with more than 1 000 objects.
 */

import { Readable } from 'node:stream';
import { getSupabaseClient } from '../db/supabaseClient.js';
import { NotFoundError, ExternalServiceError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

/** Maximum objects Supabase returns per list() call. */
const PAGE_SIZE = 1000;

/**
 * Supabase Storage implementation of StorageAdapter.
 * @implements {import('./index.js').StorageAdapter}
 */
export class SupabaseStorage {
  constructor() {
    /** @private */
    this._db = getSupabaseClient();
  }

  /**
   * List all objects in `bucket` whose path starts with `prefix`.
   * Pages through results automatically.
   *
   * @param {string} bucket
   * @param {string} [prefix]
   * @returns {Promise<import('./index.js').StorageEntry[]>}
   */
  async list(bucket, prefix = '') {
    /** @type {import('./index.js').StorageEntry[]} */
    const results = [];
    let offset = 0;

    while (true) {
      const { data, error } = await this._db.storage
        .from(bucket)
        .list(prefix || undefined, {
          limit: PAGE_SIZE,
          offset,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (error) {
        throw new ExternalServiceError(
          `Supabase Storage list failed (bucket=${bucket}, prefix=${prefix}): ${error.message}`,
          error
        );
      }

      if (!data || data.length === 0) break;

      for (const item of data) {
        if (!item.id) continue;

        const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
        results.push({
          path: fullPath,
          size: item.metadata?.size ?? 0,
          etag: item.metadata?.eTag ?? '',
          updatedAt: item.updated_at ?? item.created_at ?? new Date().toISOString(),
        });
      }

      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    return results;
  }

  /**
   * Download an object and return its content as a Buffer.
   * @param {string} bucket
   * @param {string} path
   * @returns {Promise<Buffer>}
   */
  async read(bucket, path) {
    const { data, error } = await this._db.storage.from(bucket).download(path);

    if (error) {
      if (error.message?.toLowerCase().includes('not found')) {
        throw new NotFoundError(`Object not found: ${bucket}/${path}`, error);
      }
      throw new ExternalServiceError(
        `Supabase Storage download failed (${bucket}/${path}): ${error.message}`,
        error
      );
    }

    if (!data) {
      throw new NotFoundError(`Object not found: ${bucket}/${path}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Stream an object content as a Node.js Readable stream.
   * @param {string} bucket
   * @param {string} path
   * @returns {Promise<import('node:stream').Readable>}
   */
  async readStream(bucket, path) {
    const buf = await this.read(bucket, path);
    return Readable.from(buf);
  }

  /**
   * Upload data to `path` in `bucket`, overwriting if it exists.
   * @param {string} bucket
   * @param {string} path
   * @param {Buffer | string} data
   * @returns {Promise<void>}
   */
  async write(bucket, path, data) {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

    const { error } = await this._db.storage
      .from(bucket)
      .upload(path, buffer, { upsert: true });

    if (error) {
      throw new ExternalServiceError(
        `Supabase Storage upload failed (${bucket}/${path}): ${error.message}`,
        error
      );
    }

    logger.debug({ bucket, path }, 'supabase-storage: write complete');
  }

  /**
   * Check if an object exists in `bucket`.
   * @param {string} bucket
   * @param {string} path
   * @returns {Promise<boolean>}
   */
  async exists(bucket, path) {
    const lastSlash = path.lastIndexOf('/');
    const folder = lastSlash >= 0 ? path.slice(0, lastSlash) : '';
    const name = lastSlash >= 0 ? path.slice(lastSlash + 1) : path;

    const { data, error } = await this._db.storage
      .from(bucket)
      .list(folder || undefined, {
        limit: 1,
        search: name,
      });

    if (error) {
      logger.warn(
        { bucket, path, err: error.message },
        'supabase-storage: exists check failed, assuming false'
      );
      return false;
    }

    return Array.isArray(data) && data.some((item) => item.name === name);
  }
}
