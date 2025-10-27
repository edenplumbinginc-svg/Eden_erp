import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    fs: {
      allow: ['..', '../..']
    },
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/db': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/ops/alarms': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/ops/health': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})