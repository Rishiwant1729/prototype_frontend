export function initialsFromName(name) {
  if (!name || !String(name).trim()) return "—";
  const parts = String(name).trim().split(/\s+/);
  const a = (parts[0][0] || "").toUpperCase();
  const b = (parts.length > 1 ? parts[parts.length - 1][0] : parts[0][1] || "").toUpperCase();
  return (a + b).slice(0, 2) || "—";
}
