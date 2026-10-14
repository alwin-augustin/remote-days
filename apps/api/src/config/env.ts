import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from multiple potential locations
// 1. Current working directory (usually root in dev/prod)
// 2. Parent of __dirname (for bundled dist/server.js in ~/tracker/dist)
// 3. Grandparent of __dirname (for local dev in apps/api/src)
['.env', path.join(__dirname, '../.env'), path.join(__dirname, '../../.env')].forEach((p) =>
  dotenv.config({ path: p })
);

interface Config {
  PORT: number;
  HOST: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  NODE_ENV: 'development' | 'production' | 'test';
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
  SMTP_SECURE: boolean;
  // Where a landing-page request is delivered. Kept separate from SMTP_FROM,
  // which is the *From* header and therefore has to be an address the relay has
  // verified — typically a no-reply mailbox nobody reads.
  LEAD_NOTIFICATION_EMAIL: string;
  APP_URL: string;
  // Public base URL of *this API*. Used to build OIDC redirect_uri values, which
  // must match the identity provider's app registration exactly and must point
  // at the API (that is where the session cookie is set), not at the web app.
  API_PUBLIC_URL: string;
  EMAIL_FROM: string;
  // Business Rules
  MAX_HOME_DAYS: number;
  JWT_EXPIRATION: string;
  DAILY_EMAIL_LIMIT?: number;
  // Demo seeder (nightly data reset)
  DEMO_SEED_ENABLED: boolean;
  DEMO_SEED_CRON: string;
  DEMO_SEED_TIMEZONE: string;
  DEMO_SEED_RANDOM_SEED?: number;
}

const getEnv = (key: string, required = true): string => {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`FATAL: Environment variable ${key} is missing`);
  }
  return value || '';
};

export const config: Config = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  DATABASE_URL: getEnv('DATABASE_URL'),
  JWT_SECRET: getEnv('JWT_SECRET'),
  NODE_ENV: (process.env.NODE_ENV as Config['NODE_ENV']) || 'development',
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM,
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  LEAD_NOTIFICATION_EMAIL: process.env.LEAD_NOTIFICATION_EMAIL || 'hello@remotedays.app',
  APP_URL: process.env.APP_URL || 'http://localhost:5173',
  API_PUBLIC_URL: (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || '3000'}`).replace(/\/$/, ''),
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@remotedays.app',
  MAX_HOME_DAYS: parseInt(process.env.MAX_HOME_DAYS || '34', 10),
  JWT_EXPIRATION: process.env.JWT_EXPIRATION || '8h',
  DAILY_EMAIL_LIMIT: process.env.DAILY_EMAIL_LIMIT ? parseInt(process.env.DAILY_EMAIL_LIMIT, 10) : undefined,
  // The nightly reset wipes and regenerates all demo data, so it is opt-in in
  // production (set DEMO_SEED_ENABLED=true) and on by default in development.
  DEMO_SEED_ENABLED:
    process.env.DEMO_SEED_ENABLED !== undefined
      ? process.env.DEMO_SEED_ENABLED === 'true'
      : process.env.NODE_ENV !== 'production',
  DEMO_SEED_CRON: process.env.DEMO_SEED_CRON || '0 0 * * *', // daily at 00:00
  DEMO_SEED_TIMEZONE: process.env.DEMO_SEED_TIMEZONE || 'Europe/Paris', // CET/CEST
  DEMO_SEED_RANDOM_SEED: process.env.DEMO_SEED_RANDOM_SEED
    ? parseInt(process.env.DEMO_SEED_RANDOM_SEED, 10)
    : undefined,
};
