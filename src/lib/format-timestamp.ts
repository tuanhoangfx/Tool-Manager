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

/** @deprecated Use {@link formatTimestampCompact} — same `hh:mm dd/mm/yy` format. */
export function formatTimestampTableCell(iso: string | null | undefined): string {
  return formatTimestampCompact(iso);
}

/** @deprecated Use {@link formatTimestampCompactOrDash}. */
export function formatTimestampTableCellOrDash(iso: string | null | undefined): string {
  return formatTimestampCompactOrDash(iso);
}

/** Full local datetime for table cell `title` tooltips. */
export function formatTimestampFull(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}
