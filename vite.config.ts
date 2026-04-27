import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/brasilapi': {
        target: 'https://brasilapi.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/brasilapi/, ''),
      },
      '/api/receitaws': {
        target: 'https://www.receitaws.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/receitaws/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('react-router')) {
            return 'react-vendor'
          }
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('dexie')) return 'dexie'
          if (id.includes('date-fns')) return 'date-fns'
          if (id.includes('lucide-react')) return 'lucide'
        },
      },
    },
  },
})
