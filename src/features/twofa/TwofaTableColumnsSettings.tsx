import { useEffect, useState } from "react";
import { Columns3, RotateCcw } from "lucide-react";
import { ToggleRow } from "@tool-workspace/hub-ui";
import { compactIconSize } from "../../lib/ui-scale";
import {
  readTwofaMaskPasswordInTable,
  TWOFA_TABLE_DISPLAY_CHANGE_EVENT,
  writeTwofaMaskPasswordInTable,
} from "./twofa-table-display-prefs";
import {
  DEFAULT_TWOFA_TABLE_COLUMNS,
  readTwofaTableColumns,
  resetTwofaTableColumns,
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
  const [maskPassword, setMaskPassword] = useState(() => readTwofaMaskPasswordInTable());

  useEffect(() => {
    const syncCols = () => setVisible(readTwofaTableColumns());
    const syncDisplay = () => setMaskPassword(readTwofaMaskPasswordInTable());
    window.addEventListener("twofa-table-columns-change", syncCols);
    window.addEventListener(TWOFA_TABLE_DISPLAY_CHANGE_EVENT, syncDisplay);
    return () => {
      window.removeEventListener("twofa-table-columns-change", syncCols);
      window.removeEventListener(TWOFA_TABLE_DISPLAY_CHANGE_EVENT, syncDisplay);
    };
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
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--muted)]">
          <Columns3 size={compactIconSize(12)} className="text-amber-300" aria-hidden />
          2FA table columns
        </span>
        <button
          type="button"
          onClick={() => {
            resetTwofaTableColumns();
            setVisible(new Set(DEFAULT_TWOFA_TABLE_COLUMNS));
          }}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
        >
          <RotateCcw size={10} aria-hidden />
          Reset
        </button>
      </div>
      <div className="mb-4 rounded-lg border border-white/6 bg-white/[.02] px-2 py-1">
        <ToggleRow
          label="Mask password in table"
          on={maskPassword}
          onChange={() => {
            const next = !maskPassword;
            writeTwofaMaskPasswordInTable(next);
            setMaskPassword(next);
          }}
        />
        <p className="px-1 pb-1 text-[9px] text-[var(--muted)]">Shows •••• — click still copies plain text.</p>
      </div>
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
    </div>
  );
}
