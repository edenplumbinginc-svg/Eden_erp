const API_BASE = import.meta.env?.VITE_API_BASE_URL || "";

async function json(res) {
  const t = await res.text();
  try { return t ? JSON.parse(t) : null; } catch { return null; }
}

export async function me() {
  const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
  const body = await json(res);
  return { ok: res.ok, user: body?.user ?? null };
}

export async function doLogout() {
  try { await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" }); } catch {}
}
