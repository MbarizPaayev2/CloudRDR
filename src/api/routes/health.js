/**
 * @file src/api/routes/health.js
 *
 * Health check endpoint (public, unauthenticated).
 */

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function healthRoutes(fastify) {
  const handler = async (_request, reply) => {
    return reply.status(200).send({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  };

  fastify.get('/health', handler);
  fastify.get('/api/health', handler);
}
