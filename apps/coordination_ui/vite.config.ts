// apps/coordination_ui/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    proxy: {
      // Backend API on :3000
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true,
      },
      // Direct DB helper endpoints if you expose any under /db
      "/db": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
