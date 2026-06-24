import { createCrossTabSync } from "@dev/hub-load";
import { SHEET_SOURCES_STORAGE_KEY } from "./sheet-sources";

export const SHEET_SOURCES_CHANNEL = "p0020-sheet-sources-sync";

const sheetSourcesCrossTab = createCrossTabSync({
  channelName: SHEET_SOURCES_CHANNEL,
  matchesStorageKey: sheetSourcesStorageMatcher,
});

export function sheetSourcesStorageMatcher(key: string): boolean {
  return key === SHEET_SOURCES_STORAGE_KEY;
}

export function postSheetSourcesCrossTab(type: "local-updated" | "cloud-synced" = "local-updated"): void {
  sheetSourcesCrossTab.post(type, null);
}
