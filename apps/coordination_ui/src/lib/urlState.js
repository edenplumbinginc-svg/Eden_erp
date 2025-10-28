export function getBoolParam(name, def = false) {
  const u = new URL(window.location.href);
  const v = u.searchParams.get(name);
  if (v === null) return def;
  return v === "1" || v === "true";
}

export function setBoolParam(name, val) {
  const u = new URL(window.location.href);
  if (val) u.searchParams.set(name, "1");
  else u.searchParams.delete(name);
  window.history.replaceState({}, "", u.toString());
}
