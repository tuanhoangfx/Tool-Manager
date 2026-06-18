import { HUB_DIRECTORY_TABLE_SCROLL_CLASS, hubDirectoryTableClass } from "@tool-workspace/hub-ui";

/** Re-export hub-ui scroll wrap SSOT — do not duplicate class strings locally. */
export { HUB_DIRECTORY_TABLE_SCROLL_CLASS };

/** Sheet rail + CSV grid — shared golden table skin (typography in hub-users-table.css). */
export const SHEET_DIRECTORY_TABLE_BASE_CLASS = hubDirectoryTableClass("sheet");

/** Rail fixed-row table inside HubSplitDirectoryPane — no inner scrollbars. */
export const SHEET_DIRECTORY_TABLE_WRAP_RAIL_CLASS =
  "min-h-0 min-w-0 overflow-hidden sheet-directory-table-wrap--rail";

/** Panel — single table + sticky thead scroll (column resize requires one table/colgroup). */
export const SHEET_DIRECTORY_TABLE_WRAP_PANEL_CLASS = `${HUB_DIRECTORY_TABLE_SCROLL_CLASS} min-h-0 flex-1`;
