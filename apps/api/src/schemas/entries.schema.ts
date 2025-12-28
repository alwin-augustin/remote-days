/**
 * Entries Validation Schemas
 */

import { z } from 'zod';

// Valid work statuses
const workStatusSchema = z.enum(['home', 'office', 'travel', 'sick', 'unknown']);

// Valid sources
const sourceSchema = z.enum(['user', 'slack_bot', 'email_link', 'hr_correction', 'api']);

// Date string validation (YYYY-MM-DD)
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD');

// Create entry schema
export const createEntrySchema = z.object({
  date: dateSchema,
  status: workStatusSchema,
  source: sourceSchema.optional().default('user'),
});

// Update entry schema
export const updateEntrySchema = z.object({
  status: workStatusSchema,
  source: sourceSchema.optional(),
});

// Override entry schema (HR/Admin)
export const overrideEntrySchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  date: dateSchema,
  status: workStatusSchema,
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
});

// Query parameters for entries list
export const entriesQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// CTA token action schema
export const ctaActionSchema = z.object({
  token: z.string().uuid('Invalid token'),
});

// Export types
export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
export type OverrideEntryInput = z.infer<typeof overrideEntrySchema>;
export type EntriesQueryInput = z.infer<typeof entriesQuerySchema>;

// Fastify-compatible JSON schemas
export const createEntryJsonSchema = {
  body: {
    type: 'object',
    required: ['date', 'status'],
    properties: {
      date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      status: { type: 'string', enum: ['home', 'office', 'travel', 'sick', 'unknown'] },
      source: { type: 'string', enum: ['user', 'slack_bot', 'email_link', 'hr_correction', 'api'] },
    },
  },
};

export const overrideEntryJsonSchema = {
  body: {
    type: 'object',
    required: ['userId', 'date', 'status', 'reason'],
    properties: {
      userId: { type: 'string', format: 'uuid' },
      date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      status: { type: 'string', enum: ['home', 'office', 'travel', 'sick', 'unknown'] },
      reason: { type: 'string', minLength: 10, maxLength: 500 },
    },
  },
};

export const entriesQueryJsonSchema = {
  querystring: {
    type: 'object',
    properties: {
      year: { type: 'integer', minimum: 2020, maximum: 2100 },
      month: { type: 'integer', minimum: 1, maximum: 12 },
      startDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      endDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      limit: { type: 'integer', minimum: 1, maximum: 1000, default: 100 },
      offset: { type: 'integer', minimum: 0, default: 0 },
    },
  },
};
