/**
 * @file src/api/routes/incidents.js
 *
 * Incident listing and management endpoints.
 */

import { listIncidents, getIncident } from '../../response/incidentService.js';
import { startRestore } from '../../restore/restoreService.js';
import { ValidationError } from '../../utils/errors.js';

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function incidentRoutes(fastify) {
  // GET /incidents - list all incidents
  fastify.get('/incidents', async (request, reply) => {
    const { status, accountId } = request.query || {};
    const incidents = await listIncidents({ status, accountId });
    return reply.status(200).send({
      incidents,
      count: incidents.length,
    });
  });

  // GET /incidents/:id - single incident details
  fastify.get('/incidents/:id', async (request, reply) => {
    const { id } = request.params;
    if (!id) {
      throw new ValidationError('Incident ID parameter is required');
    }

    const incident = await getIncident(id);
    return reply.status(200).send(incident);
  });

  // POST /incidents/:id/restore - start verified restore
  fastify.post('/incidents/:id/restore', async (request, reply) => {
    const { id } = request.params;
    if (!id) {
      throw new ValidationError('Incident ID parameter is required');
    }

    const report = await startRestore(id);
    return reply.status(200).send(report);
  });
}
