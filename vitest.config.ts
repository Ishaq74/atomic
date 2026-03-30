import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@i18n': resolve(__dirname, 'src/i18n'),
      '@lib': resolve(__dirname, 'src/lib'),
      '@database': resolve(__dirname, 'src/database'),
      '@smtp': resolve(__dirname, 'src/smtp'),
      '@media': resolve(__dirname, 'src/media'),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    environment: 'node',
    env: {
      NODE_ENV: 'test',
    },
    testTimeout: 15_000,
    reporters: ['default', 'json'],
    outputFile: {
      json: 'tests/reports/vitest-results.json',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/env.d.ts', 'src/**/*.astro', 'src/database/migrations/**'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 75,
        lines: 80,
      },
    },
  },
});
