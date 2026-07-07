import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

const { peerDependencies, dependencies } = pkg;

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: './src/index.ts',
      name: 'DbSchemaCore',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: [
        ...Object.keys(peerDependencies ?? {}),
        ...Object.keys(dependencies ?? {}),
        'react/jsx-runtime',
      ],
    },
  },
});