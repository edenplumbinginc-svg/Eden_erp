import axios from "axios";

// DEV-ONLY headers so the backend trusts our requests in this shell.
// Replace/remove for production login.
export const api = axios.create({
  baseURL: "/api",
  headers: {
    "X-Dev-User-Email": "test@edenplumbing.com",
    "X-Dev-User-Id": "855546bf-f53d-4538-b8d5-cd30f5c157a2",
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

// Healthz is not under /api, so create a separate call for it
export const healthCheck = () => axios.get("/healthz");
