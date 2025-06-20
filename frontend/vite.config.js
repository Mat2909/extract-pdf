import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isDev = process.env.NODE_ENV === 'development'

export default defineConfig({
  plugins: [react()],
  ...(isDev && {
    server: {
      port: 3000,
      host: '127.0.0.1',
      strictPort: true,
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:5001',
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('Erreur proxy:', err)
            })
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('Requête proxy:', req.method, req.url)
            })
          }
        },
        '/pdf.worker.js': {
          target: process.env.VITE_API_URL || 'http://localhost:5001',
          changeOrigin: true,
          secure: false
        }
      }
    }
  }),
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  worker: {
    format: 'es'
  },
  assetsInclude: ['**/*.worker.min.js'],
  define: {
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL)
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
    emptyOutDir: true
  }
})
