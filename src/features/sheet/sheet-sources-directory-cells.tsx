import type { ReactNode } from "react";
import {
  DirectoryTableBodyCell,
  HubActivityTimestampLabel,
  type HubDirectoryColumnDef,
} from "@tool-workspace/hub-ui";
import { DIRECTORY_CELL_TRUNCATE } from "../../lib/directory-cell-format";
import { sheetSourceAccentColor } from "./sheet-source-accent";
import type { SheetSource } from "./sheet-sources";
import type { SheetSourceSortKey } from "./SheetSourcesDirectoryTable";
import { SheetHighlightedText } from "./sheet-search-highlight";

function sheetSourceSyncAt(row: SheetSource): string {
  return row.lastSyncedAt ?? row.createdAt;
}

function SheetRailSelectButton({
  className,
  onSelect,
  children,
}: {
  className: string;
  onSelect?: () => void;
  children: ReactNode;
}) {
  if (!onSelect) return <>{children}</>;
  return (
    <button type="button" className={className} onClick={onSelect}>
      {children}
    </button>
  );
}

export function renderSheetSourcesDirectoryBodyCell(
  col: HubDirectoryColumnDef<SheetSourceSortKey>,
  row: SheetSource,
  onSelect?: (id: string) => void,
  searchQuery = "",
) {
  const { key, colClass } = col;
  const select = onSelect ? () => onSelect(row.id) : undefined;
  if (key === "title") {
    const accent = sheetSourceAccentColor(row.id);
    return (
      <DirectoryTableBodyCell key={key} colClass={colClass}>
        <SheetRailSelectButton className="sheet-rail-select-btn sheet-rail-select-btn--title" onSelect={select}>
          <div className="hub-users-cell-name">
            <span
              className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white/15"
              style={{ background: accent }}
              aria-hidden
            />
            <span className={`hub-users-name-title ${DIRECTORY_CELL_TRUNCATE}`} title={row.title}>
              <SheetHighlightedText text={row.title} query={searchQuery} />
            </span>
          </div>
        </SheetRailSelectButton>
      </DirectoryTableBodyCell>
    );
  }
  return (
    <DirectoryTableBodyCell key={key} colClass={colClass}>
      <SheetRailSelectButton className="sheet-rail-select-btn sheet-rail-select-btn--meta" onSelect={select}>
        <HubActivityTimestampLabel at={sheetSourceSyncAt(row)} />
      </SheetRailSelectButton>
    </DirectoryTableBodyCell>
  );
}
