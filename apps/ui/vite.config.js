import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Add your dynamic Replit host here
const allowed = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '2713c1a8-c2ca-4411-ac2c-0a0e67fe0456-00-e7yxhv9hhk1n.riker.replit.dev'
];

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,
    host: true,
    strictPort: true,
    allowedHosts: allowed,
    proxy: {
      '/api': 'http://localhost:3000',
      '/healthz': 'http://localhost:3000'
    }
  }
})
