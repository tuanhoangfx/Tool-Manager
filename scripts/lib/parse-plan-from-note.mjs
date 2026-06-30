/** Node copy of twofa-plan-fields parser (keep in sync). */

const LINE_PATTERNS = [
  { field: "planPackage", prefixes: ["Plan package:", "Plan Package:"] },
  { field: "planStatus", prefixes: ["Plan status:", "Plan Status:"] },
  { field: "planTier", prefixes: ["Plan tier:", "Plan Tier:", "Plan level:"] },
  { field: "planExpiresAt", prefixes: ["Plan due:", "Plan Due:", "Plan expires:", "Plan Expires:"] },
];

function parsePlanDate(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]) - 1;
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    const hour = m[4] ? Number(m[4]) : 0;
    const minute = m[5] ? Number(m[5]) : 0;
    const d = new Date(year, month, day, hour, minute);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  return undefined;
}

export function parsePlanFieldsFromNote(note) {
  if (!note?.trim()) return {};
  const lines = note.split(/\r?\n/);
  const out = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    for (const { field, prefixes } of LINE_PATTERNS) {
      if (out[field]) continue;
      for (const prefix of prefixes) {
        if (!trimmed.startsWith(prefix)) continue;
        const value = trimmed.slice(prefix.length).trim();
        if (!value) continue;
        if (field === "planExpiresAt") {
          const iso = parsePlanDate(value);
          if (iso) out.planExpiresAt = iso;
        } else {
          out[field] = value;
        }
        break;
      }
    }
  }
  return out;
}
