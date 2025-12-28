/**
 * Admin Validation Schemas
 */

import { z } from 'zod';

// User role
const roleSchema = z.enum(['employee', 'hr', 'admin']);

// Country code (ISO 2-letter)
const countryCodeSchema = z.string().length(2, 'Country code must be 2 characters').toUpperCase();

// Password requirements for user creation
const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Create user schema
export const createUserSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  countryOfResidence: countryCodeSchema,
  workCountry: countryCodeSchema,
  role: roleSchema.optional().default('employee'),
  notificationMethod: z.enum(['email', 'slack', 'teams', 'web']).optional().default('email'),
  slackUserId: z.string().max(100).optional(),
});

// Update user schema
export const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').max(255).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  countryOfResidence: countryCodeSchema.optional(),
  workCountry: countryCodeSchema.optional(),
  role: roleSchema.optional(),
  isActive: z.boolean().optional(),
  notificationMethod: z.enum(['email', 'slack', 'teams', 'web']).optional(),
  slackUserId: z.string().max(100).optional().nullable(),
});

// Country threshold schema
export const countryThresholdSchema = z.object({
  countryCode: countryCodeSchema,
  maxRemoteDays: z.number().int().min(0).max(365),
});

// Update country threshold schema
export const updateCountryThresholdSchema = z.object({
  maxRemoteDays: z.number().int().min(0).max(365),
});

// Holiday schema
export const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
  countryCode: countryCodeSchema.optional().nullable(),
  description: z.string().max(255).optional(),
});

// Users query schema
export const usersQuerySchema = z.object({
  role: roleSchema.optional(),
  isActive: z.coerce.boolean().optional(),
  country: countryCodeSchema.optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// Audit logs query schema
export const auditLogsQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'OVERRIDE', 'SYSTEM']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// Export types
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CountryThresholdInput = z.infer<typeof countryThresholdSchema>;
export type UpdateCountryThresholdInput = z.infer<typeof updateCountryThresholdSchema>;
export type HolidayInput = z.infer<typeof holidaySchema>;
export type UsersQueryInput = z.infer<typeof usersQuerySchema>;
export type AuditLogsQueryInput = z.infer<typeof auditLogsQuerySchema>;

// Fastify-compatible JSON schemas
export const createUserJsonSchema = {
  body: {
    type: 'object',
    required: ['email', 'password', 'firstName', 'lastName', 'countryOfResidence', 'workCountry'],
    properties: {
      email: { type: 'string', format: 'email', maxLength: 255 },
      password: {
        type: 'string',
        minLength: 12,
        maxLength: 128,
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$',
      },
      firstName: { type: 'string', minLength: 1, maxLength: 100 },
      lastName: { type: 'string', minLength: 1, maxLength: 100 },
      countryOfResidence: { type: 'string', minLength: 2, maxLength: 2 },
      workCountry: { type: 'string', minLength: 2, maxLength: 2 },
      role: { type: 'string', enum: ['employee', 'hr', 'admin'] },
      notificationMethod: { type: 'string', enum: ['email', 'slack', 'teams', 'web'] },
      slackUserId: { type: 'string', maxLength: 100 },
    },
  },
};

export const updateUserJsonSchema = {
  body: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email', maxLength: 255 },
      firstName: { type: 'string', minLength: 1, maxLength: 100 },
      lastName: { type: 'string', minLength: 1, maxLength: 100 },
      countryOfResidence: { type: 'string', minLength: 2, maxLength: 2 },
      workCountry: { type: 'string', minLength: 2, maxLength: 2 },
      role: { type: 'string', enum: ['employee', 'hr', 'admin'] },
      isActive: { type: 'boolean' },
      notificationMethod: { type: 'string', enum: ['email', 'slack', 'teams', 'web'] },
      slackUserId: { type: ['string', 'null'], maxLength: 100 },
    },
  },
};

export const countryThresholdJsonSchema = {
  body: {
    type: 'object',
    required: ['countryCode', 'maxRemoteDays'],
    properties: {
      countryCode: { type: 'string', minLength: 2, maxLength: 2 },
      maxRemoteDays: { type: 'integer', minimum: 0, maximum: 365 },
    },
  },
};

export const holidayJsonSchema = {
  body: {
    type: 'object',
    required: ['date'],
    properties: {
      date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      countryCode: { type: ['string', 'null'], minLength: 2, maxLength: 2 },
      description: { type: 'string', maxLength: 255 },
    },
  },
};
