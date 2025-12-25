import { FastifyRequest, FastifyReply } from 'fastify';
import { AuditService } from '../services/audit.service';

export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  getAuditReportHandler = async (
    request: FastifyRequest<{
      Querystring: { startDate?: string; endDate?: string; action?: string; format?: string };
    }>,
    reply: FastifyReply
  ) => {
    const { startDate, endDate, action, format } = request.query;

    if (format === 'excel') {
      try {
        const result = await this.auditService.generateAuditExcel(startDate, endDate, action);
        // Ensure it's a Buffer for Fastify
        const buffer = Buffer.from(result);

        reply
          .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
          .header(
            'Content-Disposition',
            `attachment; filename="audit_report_${new Date().toISOString().slice(0, 10)}.xlsx"`
          )
          .send(buffer);
      } catch (err) {
        request.log.error(err, 'Error generating audit Excel');
        reply.code(500).send({ message: 'Error generating report' });
      }
    } else {
      try {
        const logs = await this.auditService.getAuditReport(startDate, endDate, action);
        reply.send(logs);
      } catch (err) {
        request.log.error(err, 'Error fetching audit logs');
        reply.code(500).send({ message: 'Error fetching logs' });
      }
    }
  };
}
