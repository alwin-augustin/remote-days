import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true, // Allows using describe, it, expect without imports
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts', 'src/types/**'],
    },
    // Increase timeout for integration tests involving DB
    testTimeout: 20000, 
    hookTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret',
      DATABASE_URL: 'postgres://test:test@localhost:5432/test_db',
      SMTP_SECURE: 'false',
      SMTP_HOST: 'smtp.ethereal.email',
      SMTP_PORT: '587',
      SMTP_USER: 'test@example.com',
      SMTP_PASS: 'password',
      SMTP_FROM: 'test@example.com',
    },
  },
});
