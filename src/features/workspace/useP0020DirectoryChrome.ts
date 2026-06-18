import { useEffect, type ReactNode } from "react";
import type { HubDirectoryToolbarSelectionProps } from "@tool-workspace/hub-ui";
import type { TabHeaderStatItem } from "../../components/sales-shell";
import { useWorkspaceSearch } from "./WorkspaceSearchContext";

type ChromeInput = {
  active: boolean;
  toolbar: ReactNode;
  filterSelectionToolbar?: HubDirectoryToolbarSelectionProps;
  filterToolbar: ReactNode;
  centerStats: TabHeaderStatItem[];
};

/** Register FilterBar row-1/2 + header stats with workspace shell (P0004 HubDirectoryScreen parity). */
export function useP0020DirectoryChrome({
  active,
  toolbar,
  filterSelectionToolbar,
  filterToolbar,
  centerStats,
}: ChromeInput) {
  const { setToolbar, setFilterSelectionToolbar, setFilterToolbar, setCenterStats } = useWorkspaceSearch();

  useEffect(() => {
    if (!active) return;
    setToolbar(toolbar);
    setFilterSelectionToolbar(filterSelectionToolbar);
    setFilterToolbar(filterToolbar);
    setCenterStats(centerStats);
    return () => {
      setToolbar(null);
      setFilterSelectionToolbar(undefined);
      setFilterToolbar(null);
      setCenterStats([]);
    };
  }, [
    active,
    centerStats,
    filterSelectionToolbar,
    filterToolbar,
    setCenterStats,
    setFilterSelectionToolbar,
    setFilterToolbar,
    setToolbar,
    toolbar,
  ]);
}
