import { HubDirectoryDisplayPanel } from "@tool-workspace/hub-ui";
import type { FilterDef } from "../../components/sales-shell";
import type { WorkspaceScreen } from "../../lib/workspace-screen";
import { useWorkspaceDisplayPanelConfig } from "./workspace-display-panel-config";

type Props = {
  screen: WorkspaceScreen;
  screenFilters?: FilterDef[];
};

/** P0020 search-bar Display panel — KPI · charts · header · filters · table columns. */
export function WorkspaceDisplayBandToolbar({ screen, screenFilters }: Props) {
  const config = useWorkspaceDisplayPanelConfig({ screen, screenFilters });
  if (!config) return null;
  return <HubDirectoryDisplayPanel {...config} />;
}
