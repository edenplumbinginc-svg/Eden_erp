import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,
    host: true,
    strictPort: true,
    // Accept any host in dev (reduces Replit preview blocks)
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:3000',
      '/healthz': 'http://localhost:3000'
    }
  }
})
