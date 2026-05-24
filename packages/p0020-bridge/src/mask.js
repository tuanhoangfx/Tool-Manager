/** Masked snapshot line value (audit-only, not for login). */
export function maskSnapshotValue(value) {
  if (!value || value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
