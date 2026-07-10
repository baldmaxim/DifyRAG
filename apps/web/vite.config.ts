/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // SW только в проде, чтобы не мешать dev/HMR.
      devOptions: { enabled: false },
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Document Knowledge Portal',
        short_name: 'DKP Portal',
        description: 'Портал управления документами строительной компании',
        lang: 'ru',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        theme_color: '#2F54EB',
        background_color: '#F2F4F8',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Кэшируем только оболочку; API всегда идёт в сеть.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
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
