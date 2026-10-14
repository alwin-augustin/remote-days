import { FastifyReply, FastifyRequest } from 'fastify';
import { LeadService } from '../services/lead.service';
import { CreateLeadType } from '../schemas/lead.schema';

export class LeadController {
  constructor(private leadService: LeadService) {}

  async create(request: FastifyRequest<{ Body: CreateLeadType }>, reply: FastifyReply) {
    await this.leadService.submitLead(request.body);
    return reply.status(201).send({ message: 'Request submitted successfully' });
  }
}
