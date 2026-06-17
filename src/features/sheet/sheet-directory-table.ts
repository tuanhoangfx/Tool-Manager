import {
  HUB_DIRECTORY_TABLE_PANE_CHROME_SPLIT_CLASS,
  HUB_DIRECTORY_TABLE_SCROLL_CLASS,
  HUB_DIRECTORY_TABLE_SCROLL_FLEX_CLASS,
} from "@tool-workspace/hub-ui";

/** Re-export hub-ui scroll wrap SSOT — do not duplicate class strings locally. */
export { HUB_DIRECTORY_TABLE_SCROLL_CLASS, HUB_DIRECTORY_TABLE_SCROLL_FLEX_CLASS };

/** Rail fixed-row table inside HubSplitDirectoryPane — no inner scrollbars. */
export const SHEET_DIRECTORY_TABLE_WRAP_RAIL_CLASS =
  "min-h-0 min-w-0 overflow-hidden sheet-directory-table-wrap--rail";

/** Panel — split head/body inside pane chrome; scroll on tbody only (GPM / golden flex-pane). */
export const SHEET_DIRECTORY_TABLE_WRAP_PANEL_CLASS = `${HUB_DIRECTORY_TABLE_SCROLL_FLEX_CLASS} ${HUB_DIRECTORY_TABLE_PANE_CHROME_SPLIT_CLASS}`;
