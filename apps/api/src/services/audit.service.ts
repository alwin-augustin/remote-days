import { IAuditRepository } from '../repositories/audit.repository';
import ExcelJS from 'exceljs';

export class AuditService {
  constructor(private auditRepository: IAuditRepository) {}

  async getAuditReport(startDate?: string, endDate?: string, action?: string) {
    const logs = await this.auditRepository.getAuditLogs(startDate, endDate, action);
    return logs;
  }

  async generateAuditExcel(startDate?: string, endDate?: string, action?: string) {
    const logs = await this.auditRepository.getAuditLogs(startDate, endDate, action);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Audit Logs');

    worksheet.columns = [
      { header: 'Date/Time', key: 'created_at', width: 20 },
      { header: 'Action', key: 'action', width: 15 },
      { header: 'Actor', key: 'actor', width: 30 },
      { header: 'Target User', key: 'target_user', width: 30 },
      { header: 'Entry Date', key: 'entry_date', width: 15 },
      { header: 'Prev Status', key: 'previous_status', width: 15 },
      { header: 'New Status', key: 'new_status', width: 15 },
      { header: 'Reason', key: 'reason', width: 40 },
      { header: 'Details', key: 'details', width: 50 },
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };

    logs.forEach((log) => {
      worksheet.addRow({
        created_at: log.created_at,
        action: log.action,
        actor: log.actor_email ? `${log.actor_first_name} ${log.actor_last_name} (${log.actor_email})` : 'System',
        target_user: log.target_email
          ? `${log.target_first_name} ${log.target_last_name} (${log.target_email})`
          : 'N/A',
        entry_date: log.entry_date,
        previous_status: log.previous_status || '-',
        new_status: log.new_status || '-',
        reason: log.reason || '-',
        details: log.details ? JSON.stringify(log.details) : '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
}
