import { useEffect, type ReactNode } from "react";
import type { TabHeaderStatItem } from "../../components/sales-shell";
import { useWorkspaceSearch } from "./WorkspaceSearchContext";

type ChromeInput = {
  active: boolean;
  toolbar: ReactNode;
  filterToolbar: ReactNode;
  centerStats: TabHeaderStatItem[];
};

/** Register FilterBar row-1/2 + header stats with workspace shell (P0004 HubDirectoryScreen parity). */
export function useP0020DirectoryChrome({
  active,
  toolbar,
  filterToolbar,
  centerStats,
}: ChromeInput) {
  const { setToolbar, setFilterToolbar, setCenterStats } = useWorkspaceSearch();

  useEffect(() => {
    if (!active) return;
    setToolbar(toolbar);
    setFilterToolbar(filterToolbar);
    setCenterStats(centerStats);
    return () => {
      setToolbar(null);
      setFilterToolbar(null);
      setCenterStats([]);
    };
  }, [active, centerStats, filterToolbar, setCenterStats, setFilterToolbar, setToolbar, toolbar]);
}
