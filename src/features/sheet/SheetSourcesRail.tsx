import { Table2 } from "lucide-react";
import {
  DirectorySearchToolbar,
  HubSplitDirectoryFilterBar,
  HubSplitDirectoryPane,
  HubTimeRangeSelect,
  matchesDirectoryTimeRange,
  useDirectoryTimeRange,
  type FilterValues,
  type HubSortDir,
} from "@tool-workspace/hub-ui";
import {
  SheetSourcesDirectoryTable,
  sortSheetSources,
  type SheetSourceSortKey,
} from "./SheetSourcesDirectoryTable";
import type { SheetSource } from "./sheet-sources";

type Props = {
  sources: SheetSource[];
  totalCount: number;
  activeId: string | null;
  pageSize: number;
  query: string;
  onQueryChange: (q: string) => void;
  sortKey: SheetSourceSortKey;
  sortDir: HubSortDir;
  onSort: (key: SheetSourceSortKey) => void;
  onSelect: (id: string) => void;
  resetKey: string;
};

/** Left sheet list — HubDirectoryTableShell + golden filter row (P0004 Users parity). */
export function SheetSourcesRail({
  sources,
  totalCount,
  activeId,
  pageSize,
  query,
  onQueryChange,
  sortKey,
  sortDir,
  onSort,
  onSelect,
  resetKey,
}: Props) {
  const railTimeRange = useDirectoryTimeRange();

  const railToolbar = (
    <DirectorySearchToolbar
      showTimeRange={false}
      showRefresh={false}
      showViewToggle={false}
      showTablePageSize={false}
      countIcon={Table2}
      shown={sources.length}
      total={totalCount}
      countLabel="sheets"
    />
  );

  const sorted = sortSheetSources(sources, sortKey, sortDir);

  return (
    <HubSplitDirectoryPane
      className="sheet-rail min-h-0 shrink-0 self-stretch"
      variant="rail"
      fixedRows={pageSize}
      filterBar={
        <HubSplitDirectoryFilterBar
          shortcutScope="sheet-rail"
          query={query}
          onQueryChange={onQueryChange}
          placeholder="Search sheets…"
          values={{}}
          onValuesChange={() => {}}
          toolbar={railToolbar}
          row2Leading={<HubTimeRangeSelect value={railTimeRange} />}
        />
      }
    >
      <SheetSourcesDirectoryTable
        rows={sorted}
        activeId={activeId}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        onSelect={onSelect}
        pageSize={pageSize}
        resetKey={resetKey}
        emptyMessage={totalCount === 0 ? "No sheets — Import." : "No sheets match search or filters."}
      />
    </HubSplitDirectoryPane>
  );
}

export function filterSheetSourcesByTimeRange(
  sources: SheetSource[],
  range: ReturnType<typeof useDirectoryTimeRange>,
): SheetSource[] {
  return sources.filter((s) => matchesDirectoryTimeRange(s.lastSyncedAt ?? s.createdAt, range));
}

export type { FilterValues };
