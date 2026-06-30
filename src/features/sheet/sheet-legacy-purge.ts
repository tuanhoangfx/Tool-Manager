import { sheetSourceDedupeKey, type SheetSource } from "./sheet-sources";

/** Retired mirrors — never restore from local cache or cloud push. */
const LEGACY_PURGED_DEDUPE_KEYS = new Set([
  "10cTORpWxfp9PfuZ95gbpBhiurIM0yOose4oU5QSC-mY:404442643",
  "10cTORpWxfp9PfuZ95gbpBhiurIM0yOose4oU5QSC-mY:91093553",
]);

export function isLegacyPurgedSheetSource(source: Pick<SheetSource, "rawUrl" | "gid" | "csvUrl">): boolean {
  return LEGACY_PURGED_DEDUPE_KEYS.has(sheetSourceDedupeKey(source));
}

export function filterLegacyPurgedSheetSources<T extends Pick<SheetSource, "rawUrl" | "gid" | "csvUrl">>(rows: T[]): T[] {
  return rows.filter((row) => !isLegacyPurgedSheetSource(row));
}
