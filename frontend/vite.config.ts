import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext', // Используем современные возможности браузеров
    minify: 'esbuild', // Быстрая минификация
    rollupOptions: {
      output: {
        // Умное разделение библиотек на отдельные файлы
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) return 'vendor-framer';
            if (id.includes('recharts')) return 'vendor-recharts';
            if (id.includes('lucide-react')) return 'vendor-lucide';
            if (id.includes('react-router-dom') || id.includes('react')) return 'vendor-react';
            return 'vendor'; // Все остальные библиотеки
          }
        }
      }
    }
  }
})