import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from multiple potential locations
// 1. Current working directory (usually root in dev/prod)
// 2. Parent of __dirname (for bundled dist/server.js in ~/tracker/dist)
// 3. Grandparent of __dirname (for local dev in apps/api/src)
[
  '.env',
  path.join(__dirname, '../.env'),
  path.join(__dirname, '../../.env')
].forEach(p => dotenv.config({ path: p }));

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
  APP_URL: string;
  EMAIL_FROM: string;
  // Business Rules
  MAX_HOME_DAYS: number;
  JWT_EXPIRATION: string;
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
  APP_URL: process.env.APP_URL || 'http://localhost:5173',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@teletravail-tracker.com',
  MAX_HOME_DAYS: parseInt(process.env.MAX_HOME_DAYS || '104', 10),
  JWT_EXPIRATION: process.env.JWT_EXPIRATION || '1d',
};
