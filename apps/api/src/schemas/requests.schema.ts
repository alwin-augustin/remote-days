/**
 * Requests Validation Schemas (Status Change Requests)
 */

import { z } from 'zod';

// Valid work statuses
const workStatusSchema = z.enum(['home', 'office', 'travel', 'sick', 'unknown']);

// Valid request statuses
const requestStatusSchema = z.enum(['pending', 'approved', 'rejected']);

// Date string validation (YYYY-MM-DD)
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD');

// Create request schema
export const createRequestSchema = z.object({
  date: dateSchema,
  requestedStatus: workStatusSchema,
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000),
});

// Update request schema (approve/reject)
export const updateRequestSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  adminNote: z.string().max(1000).optional(),
});

// Query parameters for requests list
export const requestsQuerySchema = z.object({
  status: requestStatusSchema.optional(),
  userId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// Export types
export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;
export type RequestsQueryInput = z.infer<typeof requestsQuerySchema>;

// Fastify-compatible JSON schemas
export const createRequestJsonSchema = {
  body: {
    type: 'object',
    required: ['date', 'requestedStatus', 'reason'],
    properties: {
      date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      requestedStatus: { type: 'string', enum: ['home', 'office', 'travel', 'sick', 'unknown'] },
      reason: { type: 'string', minLength: 10, maxLength: 1000 },
    },
  },
};

export const updateRequestJsonSchema = {
  body: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: ['approved', 'rejected'] },
      adminNote: { type: 'string', maxLength: 1000 },
    },
  },
};

export const requestsQueryJsonSchema = {
  querystring: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
      userId: { type: 'string', format: 'uuid' },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
      offset: { type: 'integer', minimum: 0, default: 0 },
    },
  },
};
