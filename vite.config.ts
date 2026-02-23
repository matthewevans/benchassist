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
        'highs.wasm',
      ],
      manifest: {
        name: 'BenchAssist',
        short_name: 'BenchAssist',
        description: 'Rotation management for team sports',
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
