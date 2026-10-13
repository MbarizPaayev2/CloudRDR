/**
 * @file src/api/routes/health.js
 *
 * Health check endpoint (public, unauthenticated).
 */

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function healthRoutes(fastify) {
  fastify.get('/health', async (_request, reply) => {
    return reply.status(200).send({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });
}
