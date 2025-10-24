// apps/coordination_ui/src/lib/permissionsCache.js
const KEY = "eden.permissions.v1"; // bump version if shape changes
const TTL_MS = 5 * 60 * 1000;      // 5 minutes; adjust as needed

export function loadCachedPerms() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const fresh = Date.now() - (parsed.savedAt ?? 0) < TTL_MS;
    return fresh ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCachedPerms(payload) {
  try {
    const data = { ...payload, savedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
}

export function clearCachedPerms() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
