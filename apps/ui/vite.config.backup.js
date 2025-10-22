import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,
    host: '0.0.0.0',
    strictPort: false,
    allowedHosts: 'all',
    proxy: { 
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/healthz': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
