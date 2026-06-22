import { DirectoryTableColumnsSettings } from "@tool-workspace/hub-ui";
import { TWOFA_TABLE_COLUMN_ITEMS, TWOFA_TABLE_COLUMN_PREFS } from "./twofa-table-prefs";

export { countHiddenTwofaTableColumns } from "./twofa-table-prefs";

/** 2FA table column toggles — embedded in tab Settings (DisplayPrefs → Table). */
export function TwofaTableColumnsSettings() {
  return (
    <DirectoryTableColumnsSettings
      items={TWOFA_TABLE_COLUMN_ITEMS}
      prefs={TWOFA_TABLE_COLUMN_PREFS}
    />
  );
}
