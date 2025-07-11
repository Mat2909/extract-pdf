import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration spécifique pour la V2
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: 'src/main-v2.jsx'
    }
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})