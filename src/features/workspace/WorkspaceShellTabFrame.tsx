import { useState, type ReactNode } from "react";
import type { TabHeaderStatItem } from "../../components/sales-shell";
import type { FilterDef, FilterValues } from "../../components/sales-shell/FilterBar";
import type { WorkspaceNavScreen } from "../../lib/workspace-screen";
import { WorkspaceScreenChrome } from "./WorkspaceScreenChrome";
import { WorkspaceSearchProvider } from "./WorkspaceSearchContext";

type Props = {
  screen: WorkspaceNavScreen;
  active: boolean;
  children: ReactNode;
};

/** Per-tab shell (search + header) — stays mounted when visited (P0004 keep-mounted). */
export function WorkspaceShellTabFrame({ screen, active, children }: Props) {
  const [query, setQuery] = useState("");
  const [screenFilters, setScreenFilters] = useState<FilterDef[]>([]);
  const [screenFilterValues, setScreenFilterValues] = useState<FilterValues>({});
  const [screenToolbar, setScreenToolbar] = useState<ReactNode>(null);
  const [screenFilterToolbar, setScreenFilterToolbar] = useState<ReactNode>(null);
  const [screenHeaderActions, setScreenHeaderActions] = useState<ReactNode>(null);
  const [screenCenterStats, setScreenCenterStats] = useState<TabHeaderStatItem[]>([]);

  return (
    <div
      className={active ? "flex min-h-0 min-w-0 flex-1 flex-col" : "hidden"}
      aria-hidden={!active}
    >
      <WorkspaceSearchProvider
        query={query}
        setQuery={setQuery}
        filters={screenFilters}
        setFilters={setScreenFilters}
        filterValues={screenFilterValues}
        setFilterValues={setScreenFilterValues}
        toolbar={screenToolbar}
        setToolbar={setScreenToolbar}
        filterToolbar={screenFilterToolbar}
        setFilterToolbar={setScreenFilterToolbar}
        headerActions={screenHeaderActions}
        setHeaderActions={setScreenHeaderActions}
        centerStats={screenCenterStats}
        setCenterStats={setScreenCenterStats}
      >
        <WorkspaceScreenChrome
          screen={screen}
          query={query}
          onQueryChange={setQuery}
          filters={screenFilters}
          filterValues={screenFilterValues}
          onFilterValuesChange={setScreenFilterValues}
          toolbar={screenToolbar}
          filterToolbar={screenFilterToolbar}
          headerActions={screenHeaderActions}
          centerStats={screenCenterStats}
        >
          {children}
        </WorkspaceScreenChrome>
      </WorkspaceSearchProvider>
    </div>
  );
}
