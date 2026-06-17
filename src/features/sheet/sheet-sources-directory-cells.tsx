import {
  DirectoryTableBodyCell,
  formatTabHeaderTimestamp,
  type HubDirectoryColumnDef,
} from "@tool-workspace/hub-ui";
import { DIRECTORY_CELL_TRUNCATE } from "../../lib/directory-cell-format";
import { sheetSourceAccentColor } from "./sheet-source-accent";
import type { SheetSource } from "./sheet-sources";
import type { SheetSourceSortKey } from "./SheetSourcesDirectoryTable";

function sheetSourceSyncAt(row: SheetSource): string {
  return row.lastSyncedAt ?? row.createdAt;
}

export function renderSheetSourcesDirectoryBodyCell(
  col: HubDirectoryColumnDef<SheetSourceSortKey>,
  row: SheetSource,
) {
  const { key, colClass } = col;
  if (key === "title") {
    const accent = sheetSourceAccentColor(row.id);
    return (
      <DirectoryTableBodyCell key={key} colClass={colClass}>
        <div className="hub-users-cell-name">
          <span
            className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white/15"
            style={{ background: accent }}
            aria-hidden
          />
          <span className={`hub-users-name-title ${DIRECTORY_CELL_TRUNCATE}`} title={row.title}>
            {row.title}
          </span>
        </div>
      </DirectoryTableBodyCell>
    );
  }
  const label = formatTabHeaderTimestamp(sheetSourceSyncAt(row));
  return (
    <DirectoryTableBodyCell key={key} colClass={colClass}>
      <span className="sheet-rail-sync-at whitespace-nowrap text-[11px] tabular-nums text-[var(--muted)]" title={label}>
        {label}
      </span>
    </DirectoryTableBodyCell>
  );
}
