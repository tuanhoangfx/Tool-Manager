import { ToggleRow } from "@tool-workspace/hub-ui";
import type { SheetColumnFit, SheetTextAlign } from "./sheet-grid-prefs";
import { SheetTextAlignControl } from "./SheetTextAlignControl";

/** Sheet table prefs — columns + wrap + fit inside Display panel (Hub-UI golden). */
export function SheetTableDisplaySettings({
  headers,
  hidden,
  onToggle,
  wrap,
  onWrapChange,
  columnFit,
  onColumnFitChange,
  textAlign,
  onTextAlignChange,
}: {
  headers: string[];
  hidden: Set<number>;
  onToggle: (index: number) => void;
  wrap: boolean;
  onWrapChange: (next: boolean) => void;
  columnFit: SheetColumnFit;
  onColumnFitChange: (next: SheetColumnFit) => void;
  textAlign: SheetTextAlign;
  onTextAlignChange: (next: SheetTextAlign) => void;
}) {
  const visibleCount = headers.length - hidden.size;
  const fitEvenly = columnFit !== "weighted";

  return (
    <div className="space-y-3">
      <ToggleRow
        label="Wrap cell text"
        on={wrap}
        onChange={() => onWrapChange(!wrap)}
      />
      <ToggleRow
        label="Fit columns evenly"
        on={fitEvenly}
        onChange={() => onColumnFitChange(fitEvenly ? "weighted" : "equal")}
      />
      <SheetTextAlignControl value={textAlign} onChange={onTextAlignChange} />
      {headers.length > 0 ? (
        <div className="border-t border-white/5 pt-2">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Columns ({visibleCount}/{headers.length})
          </p>
          <ul className="max-h-48 space-y-0.5 overflow-auto">
            {headers.map((label, i) => {
              const on = !hidden.has(i);
              const onlyVisible = on && visibleCount <= 1;
              return (
                <li key={String(i)} className={onlyVisible ? "opacity-80" : undefined}>
                  <ToggleRow
                    label={label}
                    on={on}
                    disabled={onlyVisible}
                    onChange={() => onToggle(i)}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
