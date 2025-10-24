// apps/coordination_ui/src/lib/telemetry.js
const KEY = 'eden.telemetry.v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { hits: 0, misses: 0, lastMs: null };
  } catch {
    return { hits: 0, misses: 0, lastMs: null };
  }
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
}

export function logCacheHit() {
  const d = load();
  d.hits += 1;
  save(d);
}

export function logCacheMiss(ms) {
  const d = load();
  d.misses += 1;
  d.lastMs = ms;
  save(d);
}

export function readTelemetry() {
  return load();
}

export function resetTelemetry() {
  save({ hits: 0, misses: 0, lastMs: null });
}
