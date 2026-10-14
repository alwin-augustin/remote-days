import { FastifyRequest, FastifyReply } from 'fastify';
import { AuditService } from '../services/audit.service';
import { AppError } from '../errors/app-error';

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
      const result = await this.auditService.generateAuditExcel(startDate, endDate, action);
      const buffer = Buffer.from(result);
      reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header(
          'Content-Disposition',
          `attachment; filename="audit_report_${new Date().toISOString().slice(0, 10)}.xlsx"`
        )
        return reply.send(buffer);
    } else {
      const data = await this.auditService.getAuditReport(startDate, endDate, action);
      return reply.send({ data, total: data.length, limit: data.length, offset: 0 });
    }
  };
}
