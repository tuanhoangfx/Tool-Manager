/** Local timestamp: `hh:mm dd/mm/yy` (e.g. `18:30 03/06/26`). */
export function formatTimestampCompact(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear() % 100).padStart(2, "0");
    return `${hh}:${mm} ${dd}/${mo}/${yy}`;
  } catch {
    return "";
  }
}

/** Like {@link formatTimestampCompact} but `—` when missing/invalid. */
export function formatTimestampCompactOrDash(iso: string | null | undefined): string {
  return formatTimestampCompact(iso) || "—";
}
