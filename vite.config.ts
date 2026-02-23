/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
const commitCount = execSync('git rev-list --count HEAD').toString().trim();
const now = new Date();
const appVersion = `${now.getFullYear()}.${now.getMonth() + 1}.${commitCount}`;

export default defineConfig({
  base: '/',
  define: {
    __BUILD_HASH__: JSON.stringify(commitHash),
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/highs/')) return;
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'vendor-react';
          }
          if (id.includes('/react-router-dom/') || id.includes('/react-router/')) {
            return 'vendor-router';
          }
          if (
            id.includes('/i18next/') ||
            id.includes('/react-i18next/') ||
            id.includes('/intl-pluralrules/')
          ) {
            return 'vendor-i18n';
          }
          if (id.includes('/lucide-react/')) {
            return 'vendor-icons';
          }
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'copy-highs-wasm',
      buildStart() {
        const src = path.resolve(__dirname, 'node_modules/highs/build/highs.wasm');
        const dest = path.resolve(__dirname, 'public/highs.wasm');
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'benchassist-logo-wordmark-light.png',
        'benchassist-logo-wordmark-dark.png',
      ],
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globIgnores: ['**/highs.wasm'],
      },
      manifest: {
        name: 'BenchAssist',
        short_name: 'BenchAssist',
        description: 'Rotation management for team sports',
        start_url: '/',
        scope: '/',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
