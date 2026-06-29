import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: './src/index.ts',
      name: 'ArimCore',
      fileName: 'index',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['clsx', 'tailwind-merge'],
    },
  },
});
