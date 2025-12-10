import { FastifyInstance } from 'fastify';
import { AuditController } from './audit.controller';

async function auditRoutes(server: FastifyInstance, options: { auditController: AuditController }) {
  const { auditController } = options;

  server.get(
    '/admin/audit',
    {
      preHandler: [server.authenticate, server.authorize('admin')],
    },
    auditController.getAuditReportHandler as any
  );
}

export default auditRoutes;
