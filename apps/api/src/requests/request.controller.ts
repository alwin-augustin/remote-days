import { FastifyReply, FastifyRequest } from 'fastify';
import { RequestService } from '../services/request.service';
import { work_status } from '@remotedays/types';

export class RequestController {
  constructor(private requestService: RequestService) {}

  async createRequest(
    request: FastifyRequest<{ Body: { date: string; requestedStatus: work_status; reason: string } }>,
    reply: FastifyReply
  ) {
    const { date, requestedStatus, reason } = request.body;
    const userId = request.user.user_id;

    const result = await this.requestService.createRequest(userId, date, requestedStatus, reason);
    return reply.status(201).send(result);
  }

  // Role-scoped: HR/admin see all; employees see only their own
  async getRequests(
    request: FastifyRequest<{ Querystring: { status?: 'pending' | 'approved' | 'rejected' } }>,
    reply: FastifyReply
  ) {
    const user = request.user;
    const { status } = request.query;

    if (['hr', 'admin'].includes(user.role)) {
      const data = await this.requestService.getAllRequests(status);
      return reply.send({ data, total: data.length, limit: data.length, offset: 0 });
    }

    const data = await this.requestService.getUserRequests(user.user_id);
    return reply.send({ data, total: data.length, limit: data.length, offset: 0 });
  }

  // PATCH /requests/:id — approve or reject
  async processRequest(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { status: 'approved' | 'rejected'; adminNote?: string };
    }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const { status, adminNote } = request.body;
    const adminId = request.user.user_id;

    const action = status === 'approved' ? 'approve' : 'reject';
    const result = await this.requestService.processRequest(id, action, adminId, adminNote);
    return reply.send(result);
  }
}
