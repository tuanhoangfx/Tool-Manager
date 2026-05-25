import { createContext, useContext, type ReactNode } from "react";
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
    };
  }
  return ctx;
}
