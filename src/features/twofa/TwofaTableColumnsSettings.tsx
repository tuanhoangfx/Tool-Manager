import { useEffect, useState } from "react";
import { ToggleRow } from "@tool-workspace/hub-ui";
import {
  readTwofaTableColumns,
  TWOFA_TABLE_COLUMN_ITEMS,
  writeTwofaTableColumns,
  type TwofaTableColumnKey,
} from "./twofa-table-prefs";

export function countHiddenTwofaTableColumns(): number {
  const visible = readTwofaTableColumns();
  return TWOFA_TABLE_COLUMN_ITEMS.filter((c) => !visible.has(c.key)).length;
}

/** 2FA table column toggles — embedded in tab Settings (DisplayPrefs → Table). */
export function TwofaTableColumnsSettings() {
  const [visible, setVisible] = useState<Set<TwofaTableColumnKey>>(() => readTwofaTableColumns());

  useEffect(() => {
    const syncCols = () => setVisible(readTwofaTableColumns());
    window.addEventListener("twofa-table-columns-change", syncCols);
    return () => window.removeEventListener("twofa-table-columns-change", syncCols);
  }, []);

  function toggle(key: TwofaTableColumnKey) {
    const item = TWOFA_TABLE_COLUMN_ITEMS.find((c) => c.key === key);
    if (item?.required) return;
    const next = new Set(visible);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    writeTwofaTableColumns(next);
    setVisible(next);
  }

  return (
    <ul className="space-y-0.5">
      {TWOFA_TABLE_COLUMN_ITEMS.map((col) => {
        const on = visible.has(col.key);
        return (
          <li key={col.key} className={col.required ? "opacity-80" : undefined}>
            <div className="flex items-center gap-2">
              <div className={col.required ? "pointer-events-none flex-1" : "flex-1"}>
                <ToggleRow label={col.label} on={on} onChange={() => toggle(col.key)} />
              </div>
              {col.required ? (
                <span className="shrink-0 pr-2 text-[9px] text-[var(--muted)]">Required</span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
