import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@cisri/core': path.resolve(__dirname, '../core/src/index.ts'),
    },
  },
});
