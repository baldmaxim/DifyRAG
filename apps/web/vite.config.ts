/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // @dkp/shared is a linked CommonJS workspace package; pre-bundle it.
    include: ['@dkp/shared'],
  },
  build: {
    commonjsOptions: {
      // The shared dist lives outside node_modules (symlinked), so include it
      // explicitly for CJS -> ESM named-export interop.
      include: [/node_modules/, /packages[\\/]shared/],
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to the NestJS backend during development.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    css: false,
  },
});
