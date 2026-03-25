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
    testTimeout: 60000,
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
          include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
          exclude: [
            'src/**/__tests__/components/**',
            'src/**/*.test.tsx',
            'src/**/*.spec.tsx',
            'src/**/*.ui.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
            'src/__tests__/auto-generated/app/api/**/route.test.ts',
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
