import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@\/(.*)$/,
        replacement: `${path.resolve(__dirname, './src')}/$1`,
      },
    ],
  },
  test: {
    globals: true,
    testTimeout: 30000,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      reporter: ['text', 'lcov', 'json'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        '.next/**',
        '**/*.config.*',
        '**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
      ],
      // Floor, not a target: guards against coverage regressing below where
      // it actually stands today. Ratchet these up as more tests land —
      // do not lower them to make a change pass.
      thresholds: {
        statements: 50,
        branches: 40,
        functions: 32,
        lines: 50,
      },
    },
    projects: [
      {
        test: {
          name: 'unit-node',
          globals: true,
          environment: 'node',
          alias: {
            '@': path.resolve(__dirname, './src'),
          },
          setupFiles: ['./vitest.setup.shared.ts'],
          testTimeout: 30000,
          include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
          exclude: [
            'src/**/__tests__/components/**',
            'src/**/*.test.tsx',
            'src/**/*.spec.tsx',
            'src/**/*.ui.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
          ],
        },
      },
      {
        test: {
          name: 'unit-ui',
          globals: true,
          environment: 'jsdom',
          alias: {
            '@': path.resolve(__dirname, './src'),
          },
          setupFiles: ['./vitest.setup.shared.ts', './vitest.setup.ui.ts'],
          testTimeout: 30000,
          include: [
            'src/**/__tests__/components/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
            'src/**/*.test.tsx',
            'src/**/*.spec.tsx',
            'src/**/*.ui.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
          ],
        },
      },
    ],
  },
});
