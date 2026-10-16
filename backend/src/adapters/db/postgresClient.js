/**
 * @file src/adapters/db/postgresClient.js
 *
 * Enterprise Native PostgreSQL Connection Pool Adapter for CloudRDR.
 * Connects directly to PostgreSQL via node-postgres (pg.Pool) when DATABASE_URL
 * or PG* connection credentials are provided.
 *
 * Provides both:
 *   1. Direct parameterized SQL execution: `query(text, params)`
 *   2. Fluent query builder matching Supabase / PostgREST syntax `.from('table').select(...)...`
 *      so services can switch seamlessly between in-memory, Supabase API, and raw PostgreSQL!
 */

import pg from 'pg';
import logger from '../../utils/logger.js';

const { Pool } = pg;

/** @type {pg.Pool | null} */
let _pool = null;

/**
 * Return or initialise the PostgreSQL Connection Pool.
 * @returns {pg.Pool | null}
 */
export function getPostgresPool() {
  if (_pool) return _pool;

  const connectionString =
    process.env.DATABASE_URL ||
    (process.env.PGHOST
      ? `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || ''}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'cloudrdr'}`
      : null);

  if (!connectionString) {
    return null;
  }

  try {
    _pool = new Pool({
      connectionString,
      max: Number(process.env.PG_POOL_MAX || 20),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl:
        process.env.DATABASE_SSL === 'true' || connectionString.includes('sslmode=require')
          ? { rejectUnauthorized: false }
          : false,
    });

    _pool.on('error', (err) => {
      logger.error({ err: err.message }, 'postgresClient: unexpected pool idle client error');
    });

    logger.info({ poolSize: process.env.PG_POOL_MAX || 20 }, 'postgresClient: connection pool initialised');
    return _pool;
  } catch (err) {
    logger.error({ err: err.message }, 'postgresClient: failed to create PostgreSQL pool');
    return null;
  }
}

/**
 * Execute a raw parameterized SQL query.
 * @param {string} text
 * @param {any[]} [params=[]]
 * @returns {Promise<pg.QueryResult>}
 */
export async function query(text, params = []) {
  const pool = getPostgresPool();
  if (!pool) {
    throw new Error('PostgreSQL pool is not configured (missing DATABASE_URL)');
  }
  return pool.query(text, params);
}

/**
 * Close the pool gracefully on shutdown.
 */
export async function closePostgresPool() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    logger.info('postgresClient: pool closed');
  }
}

/**
 * PostgREST-compatible fluent query builder on top of raw PostgreSQL.
 * @param {string} tableName
 * @returns {any}
 */
export function createPostgresQueryBuilder(tableName) {
  const pool = getPostgresPool();
  const filters = [];
  let isSingle = false;
  let isMaybeSingle = false;
  let orderClause = '';
  let limitClause = '';
  let operation = 'select'; // 'select' | 'insert' | 'update' | 'delete'
  let selectCols = '*';
  let insertPayload = null;
  let updatePayload = null;

  const builder = {
    select(cols = '*') {
      selectCols = cols;
      if (!['insert', 'update', 'delete'].includes(operation)) {
        operation = 'select';
      }
      return builder;
    },
    insert(rows) {
      operation = 'insert';
      insertPayload = Array.isArray(rows) ? rows : [rows];
      return builder;
    },
    update(updates) {
      operation = 'update';
      updatePayload = updates;
      return builder;
    },
    delete() {
      operation = 'delete';
      return builder;
    },
    eq(col, val) {
      filters.push({ type: 'eq', col, val });
      return builder;
    },
    neq(col, val) {
      filters.push({ type: 'neq', col, val });
      return builder;
    },
    in(col, vals) {
      filters.push({ type: 'in', col, val: vals });
      return builder;
    },
    gte(col, val) {
      filters.push({ type: 'gte', col, val });
      return builder;
    },
    lte(col, val) {
      filters.push({ type: 'lte', col, val });
      return builder;
    },
    gt(col, val) {
      filters.push({ type: 'gt', col, val });
      return builder;
    },
    lt(col, val) {
      filters.push({ type: 'lt', col, val });
      return builder;
    },
    order(col, { ascending = true } = {}) {
      orderClause = `ORDER BY "${col}" ${ascending ? 'ASC' : 'DESC'}`;
      return builder;
    },
    limit(n) {
      limitClause = `LIMIT ${Number(n)}`;
      return builder;
    },
    single() {
      isSingle = true;
      return builder;
    },
    maybeSingle() {
      isMaybeSingle = true;
      return builder;
    },

    // Thenable promise execution
    async then(resolve, _reject) {
      try {
        if (!pool) {
          throw new Error('PostgreSQL pool not available');
        }

        const params = [];
        let pIdx = 1;

        // Build WHERE clause
        const whereParts = [];
        for (const f of filters) {
          if (f.type === 'eq') {
            whereParts.push(`"${f.col}" = $${pIdx++}`);
            params.push(f.val);
          } else if (f.type === 'neq') {
            whereParts.push(`"${f.col}" != $${pIdx++}`);
            params.push(f.val);
          } else if (f.type === 'in') {
            whereParts.push(`"${f.col}" = ANY($${pIdx++})`);
            params.push(f.val);
          } else if (f.type === 'gte') {
            whereParts.push(`"${f.col}" >= $${pIdx++}`);
            params.push(f.val);
          } else if (f.type === 'lte') {
            whereParts.push(`"${f.col}" <= $${pIdx++}`);
            params.push(f.val);
          } else if (f.type === 'gt') {
            whereParts.push(`"${f.col}" > $${pIdx++}`);
            params.push(f.val);
          } else if (f.type === 'lt') {
            whereParts.push(`"${f.col}" < $${pIdx++}`);
            params.push(f.val);
          }
        }
        const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

        let sql = '';

        if (operation === 'insert') {
          if (!insertPayload || insertPayload.length === 0) {
            return resolve({ data: [], error: null });
          }
          const keys = Object.keys(insertPayload[0]);
          const colsQuoted = keys.map((k) => `"${k}"`).join(', ');

          const rowPlaceholders = [];
          for (const row of insertPayload) {
            const rowP = [];
            for (const k of keys) {
              rowP.push(`$${pIdx++}`);
              params.push(row[k] !== undefined ? row[k] : null);
            }
            rowPlaceholders.push(`(${rowP.join(', ')})`);
          }

          sql = `INSERT INTO "${tableName}" (${colsQuoted}) VALUES ${rowPlaceholders.join(', ')} RETURNING *`;
        } else if (operation === 'update') {
          const keys = Object.keys(updatePayload);
          const setParts = [];
          for (const k of keys) {
            setParts.push(`"${k}" = $${pIdx++}`);
            params.push(updatePayload[k]);
          }
          sql = `UPDATE "${tableName}" SET ${setParts.join(', ')} ${whereClause} RETURNING *`;
        } else if (operation === 'delete') {
          sql = `DELETE FROM "${tableName}" ${whereClause} RETURNING *`;
        } else {
          // select
          const cols = selectCols === '*' ? '*' : selectCols;
          sql = `SELECT ${cols} FROM "${tableName}" ${whereClause} ${orderClause} ${limitClause}`.trim();
        }

        const res = await pool.query(sql, params);
        const rows = res.rows;

        if (isSingle) {
          if (rows.length === 0) {
            return resolve({ data: null, error: { message: 'Row not found' } });
          }
          return resolve({ data: rows[0], error: null });
        }

        if (isMaybeSingle) {
          return resolve({ data: rows[0] || null, error: null });
        }

        return resolve({ data: rows, error: null });
      } catch (err) {
        logger.error({ table: tableName, operation, err: err.message }, 'postgresClient: query error');
        return resolve({ data: null, error: { message: err.message, details: err } });
      }
    },
  };

  return builder;
}

/**
 * Return an object that implements `.from(tableName)` using PostgreSQL.
 */
export function createPostgresClient() {
  return {
    from: createPostgresQueryBuilder,
    query,
    _isPostgres: true,
  };
}
