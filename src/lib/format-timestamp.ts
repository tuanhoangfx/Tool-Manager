import {
  formatHubTimestampCompact,
  formatHubTimestampFull,
} from "../../vendor/hub-ui/src/lib/format-hub-timestamp-compact";

/** Local timestamp: `hh:mm dd/mm/yy` (e.g. `18:30 03/06/26`). */
export const formatTimestampCompact = formatHubTimestampCompact;

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
export const formatTimestampFull = formatHubTimestampFull;
