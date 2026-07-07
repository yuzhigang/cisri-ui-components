import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

const { peerDependencies, dependencies } = pkg;

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: false,
    lib: {
      entry: './src/index.ts',
      name: 'CisriShadcn',
      fileName: 'index',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [
        ...Object.keys(peerDependencies),
        ...Object.keys(dependencies),
        'react/jsx-runtime',
      ],
    },
  },
});