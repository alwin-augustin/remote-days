/**
 * Auth Validation Schemas
 * Using Zod for runtime validation with TypeScript inference
 */

import { z } from 'zod';

// Password requirements: 12+ chars, uppercase, lowercase, number, special char
const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Login schema - less strict password validation (for login, not registration)
export const loginSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(1, 'Password is required').max(128),
});

// Registration schema - strict password validation
export const registerSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: passwordSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  countryOfResidence: z.string().length(2, 'Country code must be 2 characters'),
  workCountry: z.string().length(2, 'Country code must be 2 characters'),
});

// Password reset request schema
export const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
});

// Password reset schema - strict password validation
export const passwordResetSchema = z.object({
  token: z.string().uuid('Invalid token format'),
  password: passwordSchema,
});

// Export types for TypeScript
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

// Fastify-compatible JSON schema for login (for rate limiting purposes)
export const loginJsonSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', maxLength: 255 },
      password: { type: 'string', minLength: 1, maxLength: 128 },
    },
  },
};

// Fastify-compatible JSON schema for password reset request
export const passwordResetRequestJsonSchema = {
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email', maxLength: 255 },
    },
  },
};

// Fastify-compatible JSON schema for password reset
export const passwordResetJsonSchema = {
  body: {
    type: 'object',
    required: ['token', 'password'],
    properties: {
      token: { type: 'string', format: 'uuid' },
      password: {
        type: 'string',
        minLength: 12,
        maxLength: 128,
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$',
      },
    },
  },
};
