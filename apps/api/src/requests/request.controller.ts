import { FastifyReply, FastifyRequest } from 'fastify';
import { RequestService } from '../services/request.service';
import { work_status } from '@remotedays/types';

export class RequestController {
  constructor(private requestService: RequestService) {}

  async createRequest(
    request: FastifyRequest<{ Body: { date: string; status: work_status; reason: string } }>,
    reply: FastifyReply
  ) {
    const { date, status, reason } = request.body;
    const userId = request.user.user_id;

    const result = await this.requestService.createRequest(userId, date, status, reason);
    return reply.status(201).send(result);
  }

  async getMyRequests(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.user_id;
    const requests = await this.requestService.getUserRequests(userId);
    return reply.send(requests);
  }

  async getAllRequests(
    request: FastifyRequest<{ Querystring: { status?: 'pending' | 'approved' | 'rejected' } }>,
    reply: FastifyReply
  ) {
    const { status } = request.query;
    const requests = await this.requestService.getAllRequests(status);
    return reply.send(requests);
  }

  async processRequest(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { action: 'approve' | 'reject'; note?: string };
    }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const { action, note } = request.body;
    const adminId = request.user.user_id;

    const result = await this.requestService.processRequest(id, action, adminId, note);
    return reply.send(result);
  }
}
