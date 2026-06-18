import { useEffect, type ReactNode } from "react";
import type { HubDirectoryToolbarSelectionProps, HubViewMode } from "@tool-workspace/hub-ui";
import type { TabHeaderStatItem } from "../../components/sales-shell";
import { useWorkspaceSearch } from "./WorkspaceSearchContext";

type ChromeInput = {
  active: boolean;
  toolbar: ReactNode;
  filterSelectionToolbar?: HubDirectoryToolbarSelectionProps;
  directoryViewMode?: HubViewMode;
  filterToolbar: ReactNode;
  centerStats: TabHeaderStatItem[];
};

/** Register FilterBar row-1/2 + header stats with workspace shell (P0004 HubDirectoryScreen parity). */
export function useP0020DirectoryChrome({
  active,
  toolbar,
  filterSelectionToolbar,
  directoryViewMode,
  filterToolbar,
  centerStats,
}: ChromeInput) {
  const {
    setToolbar,
    setFilterSelectionToolbar,
    setDirectoryViewMode,
    setFilterToolbar,
    setCenterStats,
  } = useWorkspaceSearch();

  useEffect(() => {
    if (!active) return;
    setToolbar(toolbar);
    setFilterSelectionToolbar(filterSelectionToolbar);
    setDirectoryViewMode(directoryViewMode);
    setFilterToolbar(filterToolbar);
    setCenterStats(centerStats);
    return () => {
      setToolbar(null);
      setFilterSelectionToolbar(undefined);
      setDirectoryViewMode(undefined);
      setFilterToolbar(null);
      setCenterStats([]);
    };
  }, [
    active,
    centerStats,
    directoryViewMode,
    filterSelectionToolbar,
    filterToolbar,
    setCenterStats,
    setDirectoryViewMode,
    setFilterSelectionToolbar,
    setFilterToolbar,
    setToolbar,
    toolbar,
  ]);
}
