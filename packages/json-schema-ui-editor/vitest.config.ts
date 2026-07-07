import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
  },
  resolve: {
    alias: {
      '@cisri/core': path.resolve(__dirname, '../core/src'),
      '@cisri/json-schema-core': path.resolve(__dirname, '../json-schema-core/src'),
      '@cisri/json-schema-ui-core': path.resolve(__dirname, '../json-schema-ui-core/src'),
      '@cisri/json-schema-form': path.resolve(__dirname, '../json-schema-form/src'),
      '@cisri/shadcn': path.resolve(__dirname, '../shadcn/src'),
    },
  },
});