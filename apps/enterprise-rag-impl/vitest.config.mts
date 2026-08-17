import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(process.cwd(), 'src/modules'),
      '~': resolve(process.cwd(), 'src'),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts',
        'src/database/migrate.ts',
        'src/database/schema.ts',
        'src/platform/setup.ts',
        'src/observability/tracing.ts',
        'src/scripts/**',
        '**/*.port.ts',
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
});
