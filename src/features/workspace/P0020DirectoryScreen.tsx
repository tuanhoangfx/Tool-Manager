import type { ReactNode } from "react";
import { HubPaginatedCardGrid } from "@tool-workspace/hub-ui";
import type { HubViewMode } from "../../components/sales-shell";

export type P0020DirectoryScreenProps<T> = {
  items: readonly T[];
  viewMode: HubViewMode;
  resetKey: string | number | boolean | null;
  empty: ReactNode;
  table: ReactNode;
  cardGridAriaLabel: string;
  renderCard: (item: T) => ReactNode;
};

/** P0020 directory body — card grid or table via shared pager (P0004 Users parity; read-only-directory). */
export function P0020DirectoryScreen<T>({
  items,
  viewMode,
  resetKey,
  empty,
  table,
  cardGridAriaLabel,
  renderCard,
}: P0020DirectoryScreenProps<T>) {
  if (items.length === 0) return empty;

  if (viewMode === "card") {
    return (
      <HubPaginatedCardGrid items={items} resetKey={resetKey} ariaLabel={cardGridAriaLabel}>
        {(pageItems) => pageItems.map(renderCard)}
      </HubPaginatedCardGrid>
    );
  }

  return table;
}
