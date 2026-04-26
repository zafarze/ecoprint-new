import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Автоматически обновлять SW когда есть новая версия
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // Файлы, которые лежат в public/ — попадут в манифест
      includeAssets: [
        'favicon.png',
        'apple-touch-icon.png',
      ],

      manifest: {
        name: 'ЭкоПринт CRM',
        short_name: 'ЭкоПринт',
        description: 'CRM для типографии — заказы, статусы, аналитика',
        theme_color: '#0088cc',
        background_color: '#ffffff',
        display: 'standalone',          // запуск без адресной строки
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'ru',
        categories: ['business', 'productivity'],
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          // Используем 512x512 как maskable (не идеально, но работает —
          // сделай отдельные maskable иконки с safe zone в центре 80% если нужны).
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        // Что кэшировать в SW (статика приложения)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Поднимаем лимит precache до 5 MB (на случай больших иконок).
        // Совет: сжать pwa-512.png (для 512×512 PNG норма 50-100 KB).
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Запросы к API не кэшируем агрессивно — только сетевая стратегия с фолбэком
        runtimeCaching: [
          // Шрифты Google
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          // FontAwesome CDN
          {
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-fontawesome',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          // API запросы — NetworkFirst, чтобы свежие данные были приоритетнее
          // НО offline получаем последние закэшированные
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Картинки (медиа)
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
        // SPA fallback — чтобы при offline-навигации возвращался index.html
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // Очистка старых кэшей при обновлении SW
        cleanupOutdatedCaches: true,
      },

      devOptions: {
        // В dev-режиме PWA не активен по умолчанию (можно включить для тестов)
        enabled: false,
      },
    }),
  ],

  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) return 'vendor-framer';
            if (id.includes('recharts')) return 'vendor-recharts';
            if (id.includes('lucide-react')) return 'vendor-lucide';
            if (id.includes('react-router-dom') || id.includes('react')) return 'vendor-react';
            return 'vendor';
          }
        }
      }
    }
  }
})
