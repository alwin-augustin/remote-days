/**
 * Centralized TypeBox Schema Library
 * Single source of truth for all API request/response validation and TypeScript types.
 * Replaces the dual Zod + JSON-schema approach.
 */

import { Static, Type } from '@sinclair/typebox';

// ---------------------------------------------------------------------------
// Common primitives
// ---------------------------------------------------------------------------

const DateString = Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'ISO date YYYY-MM-DD' });
const UUIDString = Type.String({ format: 'uuid' });
const CountryCode = Type.String({ minLength: 2, maxLength: 2, description: 'ISO 3166-1 alpha-2' });

export const WorkStatus = Type.Union([
  Type.Literal('home'),
  Type.Literal('office'),
  Type.Literal('travel'),
  Type.Literal('sick'),
  Type.Literal('unknown'),
]);

export const UserRole = Type.Union([
  Type.Literal('employee'),
  Type.Literal('hr'),
  Type.Literal('admin'),
]);

const StrongPassword = Type.String({
  minLength: 12,
  maxLength: 128,
  pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$',
  description: 'Min 12 chars, uppercase, lowercase, digit, special character',
});

// ---------------------------------------------------------------------------
// Auth schemas
// ---------------------------------------------------------------------------

export const LoginBody = Type.Object({
  email: Type.String({ format: 'email', maxLength: 255 }),
  password: Type.String({ minLength: 1, maxLength: 128 }),
});

export const PasswordResetRequestBody = Type.Object({
  email: Type.String({ format: 'email', maxLength: 255 }),
});

export const PasswordResetBody = Type.Object({
  token: UUIDString,
  password: StrongPassword,
});

export type LoginBodyType = Static<typeof LoginBody>;
export type PasswordResetRequestBodyType = Static<typeof PasswordResetRequestBody>;
export type PasswordResetBodyType = Static<typeof PasswordResetBody>;

// ---------------------------------------------------------------------------
// Entry schemas
// ---------------------------------------------------------------------------

export const CreateEntryBody = Type.Object({
  date: DateString,
  status: WorkStatus,
});

export const EntriesQuerystring = Type.Object({
  year: Type.Optional(Type.Integer({ minimum: 2020, maximum: 2100 })),
  month: Type.Optional(Type.Integer({ minimum: 1, maximum: 12 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 1000, default: 100 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
});

export const OverrideEntryBody = Type.Object({
  userId: UUIDString,
  date: DateString,
  status: WorkStatus,
  reason: Type.String({ minLength: 10, maxLength: 500 }),
});

export const OverrideEntryParams = Type.Object({
  userId: UUIDString,
  date: DateString,
});

export type CreateEntryBodyType = Static<typeof CreateEntryBody>;
export type EntriesQuerystringType = Static<typeof EntriesQuerystring>;
export type OverrideEntryBodyType = Static<typeof OverrideEntryBody>;
export type OverrideEntryParamsType = Static<typeof OverrideEntryParams>;

// ---------------------------------------------------------------------------
// CTA schemas
// ---------------------------------------------------------------------------

export const CtaRedemptionBody = Type.Object({
  token: UUIDString,
});

export type CtaRedemptionBodyType = Static<typeof CtaRedemptionBody>;

// ---------------------------------------------------------------------------
// Admin / User schemas
// ---------------------------------------------------------------------------

export const CreateUserBody = Type.Object({
  email: Type.String({ format: 'email', maxLength: 255 }),
  temp_password: StrongPassword,
  first_name: Type.String({ minLength: 1, maxLength: 100 }),
  last_name: Type.String({ minLength: 1, maxLength: 100 }),
  country_of_residence: CountryCode,
  work_country: CountryCode,
  role: Type.Optional(UserRole),
});

export const UpdateUserBody = Type.Object({
  email: Type.Optional(Type.String({ format: 'email', maxLength: 255 })),
  first_name: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  last_name: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  country_of_residence: Type.Optional(CountryCode),
  work_country: Type.Optional(CountryCode),
  role: Type.Optional(UserRole),
  is_active: Type.Optional(Type.Boolean()),
});

export const UserIdParam = Type.Object({ id: UUIDString });

export const UsersQuerystring = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 50 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
  search: Type.Optional(Type.String({ maxLength: 100 })),
  role: Type.Optional(UserRole),
  country: Type.Optional(CountryCode),
});

export type CreateUserBodyType = Static<typeof CreateUserBody>;
export type UpdateUserBodyType = Static<typeof UpdateUserBody>;
export type UsersQuerystringType = Static<typeof UsersQuerystring>;

// ---------------------------------------------------------------------------
// Country / Threshold schemas
// ---------------------------------------------------------------------------

export const CreateCountryBody = Type.Object({
  country_code: CountryCode,
  max_remote_days: Type.Integer({ minimum: 0, maximum: 365 }),
});

export const UpdateCountryBody = Type.Object({
  max_remote_days: Type.Integer({ minimum: 0, maximum: 365 }),
});

export const CountryCodeParam = Type.Object({ code: CountryCode });

export type CreateCountryBodyType = Static<typeof CreateCountryBody>;
export type UpdateCountryBodyType = Static<typeof UpdateCountryBody>;

// ---------------------------------------------------------------------------
// Holiday schemas
// ---------------------------------------------------------------------------

export const CreateHolidayBody = Type.Object({
  date: DateString,
  country_code: Type.Optional(Type.Union([CountryCode, Type.Null()])),
  description: Type.Optional(Type.String({ maxLength: 255 })),
});

export const HolidayIdParam = Type.Object({ id: UUIDString });

export type CreateHolidayBodyType = Static<typeof CreateHolidayBody>;

// ---------------------------------------------------------------------------
// Request (status-change request) schemas
// ---------------------------------------------------------------------------

export const CreateRequestBody = Type.Object({
  date: DateString,
  requestedStatus: WorkStatus,
  reason: Type.String({ minLength: 10, maxLength: 1000 }),
});

export const ProcessRequestBody = Type.Object({
  status: Type.Union([Type.Literal('approved'), Type.Literal('rejected')]),
  adminNote: Type.Optional(Type.String({ maxLength: 1000 })),
});

export const RequestIdParam = Type.Object({ id: UUIDString });

export const RequestsQuerystring = Type.Object({
  status: Type.Optional(Type.Union([
    Type.Literal('pending'),
    Type.Literal('approved'),
    Type.Literal('rejected'),
  ])),
  userId: Type.Optional(UUIDString),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 50 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
});

export type CreateRequestBodyType = Static<typeof CreateRequestBody>;
export type ProcessRequestBodyType = Static<typeof ProcessRequestBody>;
export type RequestsQuerystringType = Static<typeof RequestsQuerystring>;

// ---------------------------------------------------------------------------
// Audit schemas
// ---------------------------------------------------------------------------

export const AuditQuerystring = Type.Object({
  userId: Type.Optional(UUIDString),
  action: Type.Optional(Type.Union([
    Type.Literal('CREATE'),
    Type.Literal('UPDATE'),
    Type.Literal('DELETE'),
    Type.Literal('OVERRIDE'),
    Type.Literal('SYSTEM'),
  ])),
  startDate: Type.Optional(DateString),
  endDate: Type.Optional(DateString),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 500, default: 100 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
});

export type AuditQuerystringType = Static<typeof AuditQuerystring>;
