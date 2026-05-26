import { createContext, useContext, type ReactNode } from "react";
import type { TabHeaderStatItem } from "../../components/sales-shell";
import type { FilterDef, FilterValues } from "../../components/sales-shell/FilterBar";

type Ctx = {
  query: string;
  setQuery: (q: string) => void;
  filters: FilterDef[];
  setFilters: (filters: FilterDef[]) => void;
  filterValues: FilterValues;
  setFilterValues: (next: FilterValues) => void;
  toolbar: ReactNode;
  setToolbar: (toolbar: ReactNode) => void;
  filterToolbar: ReactNode;
  setFilterToolbar: (toolbar: ReactNode) => void;
  headerActions: ReactNode;
  setHeaderActions: (actions: ReactNode) => void;
  centerStats: TabHeaderStatItem[];
  setCenterStats: (stats: TabHeaderStatItem[]) => void;
};

const WorkspaceSearchContext = createContext<Ctx | null>(null);

export function WorkspaceSearchProvider({
  query,
  setQuery,
  filters,
  setFilters,
  filterValues,
  setFilterValues,
  toolbar,
  setToolbar,
  filterToolbar,
  setFilterToolbar,
  headerActions,
  setHeaderActions,
  centerStats,
  setCenterStats,
  children,
}: {
  query: string;
  setQuery: (q: string) => void;
  filters: FilterDef[];
  setFilters: (filters: FilterDef[]) => void;
  filterValues: FilterValues;
  setFilterValues: (next: FilterValues) => void;
  toolbar: ReactNode;
  setToolbar: (toolbar: ReactNode) => void;
  filterToolbar: ReactNode;
  setFilterToolbar: (toolbar: ReactNode) => void;
  headerActions: ReactNode;
  setHeaderActions: (actions: ReactNode) => void;
  centerStats: TabHeaderStatItem[];
  setCenterStats: (stats: TabHeaderStatItem[]) => void;
  children: ReactNode;
}) {
  return (
    <WorkspaceSearchContext.Provider
      value={{
        query,
        setQuery,
        filters,
        setFilters,
        filterValues,
        setFilterValues,
        toolbar,
        setToolbar,
        filterToolbar,
        setFilterToolbar,
        headerActions,
        setHeaderActions,
        centerStats,
        setCenterStats,
      }}
    >
      {children}
    </WorkspaceSearchContext.Provider>
  );
}

export function useWorkspaceSearch() {
  const ctx = useContext(WorkspaceSearchContext);
  if (!ctx) {
    return {
      query: "",
      setQuery: () => {},
      filters: [],
      setFilters: () => {},
      filterValues: {},
      setFilterValues: () => {},
      toolbar: null,
      setToolbar: () => {},
      filterToolbar: null,
      setFilterToolbar: () => {},
      headerActions: null,
      setHeaderActions: () => {},
      centerStats: [],
      setCenterStats: () => {},
    };
  }
  return ctx;
}
