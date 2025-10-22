import axios from "axios";

export const api = axios.create({
  baseURL: "/", // works for /healthz and /api/*
  headers: {
    "X-Dev-User-Email": "test@edenplumbing.com",
    "X-Dev-User-Id": "855546bf-f53d-4538-b8d5-cd30f5c157a2",
    "Content-Type": "application/json",
  },
});

// Tiny helper: GET JSON with graceful empty fallback
export async function getJSON(url, params) {
  try { 
    const r = await api.get(url, { params }); 
    return r.data; 
  } catch { 
    return null; 
  }
}
