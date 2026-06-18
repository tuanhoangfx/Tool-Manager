/** Single-line directory table timestamps (Hub-UI golden parity). */
export function formatDirectoryDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${pick("day")} ${pick("month")} ${pick("year")} ${pick("hour")}:${pick("minute")}`.trim();
}

export const DIRECTORY_CELL_TRUNCATE = "block max-w-full truncate";
