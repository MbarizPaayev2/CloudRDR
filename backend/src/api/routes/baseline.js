/**
 * @file src/api/routes/baseline.js
 *
 * Baseline management endpoints.
 */

import { createBaseline, getBaseline } from '../../baseline/baselineService.js';
import { ValidationError } from '../../utils/errors.js';

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function baselineRoutes(fastify) {
  // POST /baseline - start baseline creation
  fastify.post('/baseline', async (request, reply) => {
    const { bucket } = request.body || {};
    if (!bucket || typeof bucket !== 'string' || bucket.trim() === '') {
      throw new ValidationError('Field "bucket" is required and must be a non-empty string');
    }

    const bucketName = bucket.trim();
    const autoSeed = request.body?.autoSeed ?? (bucketName === 'protected');
    const result = await createBaseline(bucketName, { autoSeed });
    return reply.status(201).send(result);
  });

  // GET /baseline/:bucket - current snapshot + Merkle root
  fastify.get('/baseline/:bucket', async (request, reply) => {
    const { bucket } = request.params;
    if (!bucket) {
      throw new ValidationError('Param "bucket" is required');
    }

    const baseline = await getBaseline(bucket);
    return reply.status(200).send(baseline);
  });
}
