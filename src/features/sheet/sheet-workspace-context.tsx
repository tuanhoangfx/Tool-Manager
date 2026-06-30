import { createContext, useContext, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { Session } from "@supabase/supabase-js";
import type { HubSortDir } from "@tool-workspace/hub-ui";
import type { SheetSource } from "./sheet-sources";
import type { SheetSourceSortKey } from "./SheetSourcesDirectoryTable";

export type SheetWorkspaceBridge = {
  activateSheet: (id: string) => void;
  prefetchSheet: (source: SheetSource) => void;
};

const noopBridge: SheetWorkspaceBridge = {
  activateSheet: () => {},
  prefetchSheet: () => {},
};

export type SheetWorkspaceContextValue = {
  tabActive: boolean;
  session: Session | null;
  sources: SheetSource[];
  setSources: Dispatch<SetStateAction<SheetSource[]>>;
  activeId: string | null;
  setActiveId: Dispatch<SetStateAction<string | null>>;
  active: SheetSource | null;
  filteredSources: SheetSource[];
  sortedRailSources: SheetSource[];
  pageSize: number;
  railQuery: string;
  setRailQuery: (query: string) => void;
  railSortKey: SheetSourceSortKey;
  railSortDir: HubSortDir;
  onRailSort: (key: SheetSourceSortKey) => void;
  bridge: SheetWorkspaceBridge;
  setBridge: Dispatch<SetStateAction<SheetWorkspaceBridge>>;
};

const SheetWorkspaceContext = createContext<SheetWorkspaceContextValue | null>(null);

export function SheetWorkspaceProvider({
  value,
  children,
}: {
  value: SheetWorkspaceContextValue;
  children: ReactNode;
}) {
  return <SheetWorkspaceContext.Provider value={value}>{children}</SheetWorkspaceContext.Provider>;
}

export function useSheetWorkspace(): SheetWorkspaceContextValue {
  const ctx = useContext(SheetWorkspaceContext);
  if (!ctx) throw new Error("useSheetWorkspace must be used within SheetWorkspaceProvider");
  return ctx;
}

export { noopBridge };
