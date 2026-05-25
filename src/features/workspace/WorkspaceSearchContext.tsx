import { createContext, useContext, type ReactNode } from "react";

type Ctx = {
  query: string;
  setQuery: (q: string) => void;
};

const WorkspaceSearchContext = createContext<Ctx | null>(null);

export function WorkspaceSearchProvider({
  query,
  setQuery,
  children,
}: {
  query: string;
  setQuery: (q: string) => void;
  children: ReactNode;
}) {
  return (
    <WorkspaceSearchContext.Provider value={{ query, setQuery }}>
      {children}
    </WorkspaceSearchContext.Provider>
  );
}

export function useWorkspaceSearch() {
  const ctx = useContext(WorkspaceSearchContext);
  if (!ctx) {
    return { query: "", setQuery: () => {} };
  }
  return ctx;
}
