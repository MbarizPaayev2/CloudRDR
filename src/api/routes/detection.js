/**
 * @file src/api/routes/detection.js
 *
 * Detection engine query endpoints.
 */

import { getSupabaseClient, supaQuery } from '../../adapters/db/supabaseClient.js';

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function detectionRoutes(fastify) {
  // GET /detection/runs?limit=
  fastify.get('/detection/runs', async (request, reply) => {
    const rawLimit = request.query?.limit;
    const limit = rawLimit ? Math.min(Math.max(parseInt(rawLimit, 10) || 50, 1), 500) : 50;

    const db = getSupabaseClient();
    const runs = await supaQuery(
      db.from('detection_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
    );

    return reply.status(200).send({
      runs: runs || [],
      limit,
    });
  });
}
