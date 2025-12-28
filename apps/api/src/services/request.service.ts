import { IRequestRepository } from '../repositories/request.repository';
import { EntryService } from './entry.service';
import { IAuditRepository } from '../repositories/audit.repository';
import { IUserRepository } from '../repositories/user.repository';
import { EmailService } from './email.service';
import { EntryRequest, RequestStatus, work_status } from '@remotedays/types';
import { AppError } from '../errors/app-error';
import { createLogger } from '../utils/logger';

const log = createLogger('RequestService');

export class RequestService {
    constructor(
        private requestRepo: IRequestRepository,
        private entryService: EntryService,
        private auditRepo: IAuditRepository,
        private userRepo: IUserRepository,
        private emailService: EmailService
    ) { }

    async createRequest(userId: string, date: string, status: work_status, reason: string): Promise<EntryRequest> {
        if (!reason || reason.trim().length === 0) {
            throw new AppError('Reason is required', 400);
        }

        const request = await this.requestRepo.create(userId, date, status, reason);
        const user = await this.userRepo.findById(userId);

        // Audit creation
        await this.auditRepo.log(
            'CREATE',
            userId, // actor
            userId, // target
            reason,
            'request',
            request.id,
            undefined, undefined, undefined, undefined, undefined, undefined,
            { requested_status: status, date, action: 'request_change' }
        );

        // Notify HR
        if (user) {
            // Fetch HR users (limit 50, usually enough for notification recipients)
            const { users: hrUsers } = await this.userRepo.findAll(50, 0, undefined, { role: 'hr' });

            const subject = `New Request from ${user.first_name} ${user.last_name}`;
            const text = `User ${user.first_name} ${user.last_name} (${user.email}) has requested a status change to '${status}' for date ${date}.\nReason: ${reason}\n\nPlease review in the dashboard.`;

            // Parallel send
            await Promise.all(hrUsers.map(hr =>
                this.emailService.sendEmail(hr.email, subject, text, `<p>${text.replace(/\n/g, '<br>')}</p>`)
                    .catch(err => log.error({ err, email: hr.email }, `Failed to email HR ${hr.email}`))
            ));
        }

        return request;
    }

    async getUserRequests(userId: string): Promise<EntryRequest[]> {
        return this.requestRepo.findByUser(userId);
    }

    async getAllRequests(statusFilter?: RequestStatus): Promise<EntryRequest[]> {
        if (statusFilter) {
            return this.requestRepo.findByStatus(statusFilter);
        }
        return this.requestRepo.findAll();
    }

    async processRequest(requestId: string, action: 'approve' | 'reject', adminId: string, adminNote?: string): Promise<EntryRequest> {
        const request = await this.requestRepo.findById(requestId);
        if (!request) throw new AppError('Request not found', 404);
        if (request.status !== 'pending') throw new AppError('Request is already processed', 400);

        const newStatus: RequestStatus = action === 'approve' ? 'approved' : 'rejected';

        const updatedRequest = await this.requestRepo.updateStatus(requestId, newStatus, adminId, adminNote);
        if (!updatedRequest) throw new AppError('Failed to update request', 500);

        // Audit the decision
        await this.auditRepo.log(
            'UPDATE',
            adminId,
            request.user_id,
            adminNote || `${action} request`,
            'request',
            requestId,
            undefined, undefined, undefined, undefined, undefined, undefined,
            {
                old_status: 'pending',
                new_status: newStatus,
                request_details: request
            }
        );

        // If approved, ACTUALLY update the entry
        if (action === 'approve') {
            await this.entryService.overrideEntry(
                request.user_id,
                typeof request.date === 'object' ? (request.date as any).toISOString().split('T')[0] : request.date,
                request.requested_status,
                `Approved Request #${request.id}: ${request.reason}`,
                adminId,
                'admin'
            );
        }

        // Notify User
        const user = await this.userRepo.findById(request.user_id);
        const admin = await this.userRepo.findById(adminId);
        if (user) {
            const subject = `Your Request was ${newStatus.toUpperCase()}`;
            const text = `Your request to change status to '${request.requested_status}' for ${request.date} has been ${newStatus} by ${admin?.first_name || 'HR'}.\n\nNote: ${adminNote || 'No additional notes.'}`;

            await this.emailService.sendEmail(
                user.email,
                subject,
                text,
                `<p>${text.replace(/\n/g, '<br>')}</p>`
            ).catch(err => log.error({ err, email: user.email }, `Failed to email user ${user.email}`));
        }

        return updatedRequest;
    }
}
