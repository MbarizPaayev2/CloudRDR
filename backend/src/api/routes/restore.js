/**
 * @file src/api/routes/restore.js
 *
 * Restore job inspection endpoints.
 */

import { getRestoreJob } from '../../restore/restoreService.js';
import { ValidationError } from '../../utils/errors.js';

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function restoreRoutes(fastify) {
  // GET /restore/:jobId - retrieve job status and per-file results
  fastify.get('/restore/:jobId', async (request, reply) => {
    const { jobId } = request.params;
    if (!jobId) {
      throw new ValidationError('Param "jobId" is required');
    }

    const job = await getRestoreJob(jobId);
    return reply.status(200).send(job);
  });
}
