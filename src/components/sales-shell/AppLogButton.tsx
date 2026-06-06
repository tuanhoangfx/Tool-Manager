import { HubUsageLogPanel } from "@tool-workspace/hub-ui";
import type { WorkspaceLogEntry } from "../../features/workspace/workspace-log-types";

type Props = {
  logs: WorkspaceLogEntry[];
  compact?: boolean;
  sidebarRow?: boolean;
};

/** P0004 golden — usage log via shared HubToolDetailModal shell. */
export function AppLogButton({ logs, compact = true, sidebarRow = false }: Props) {
  return <HubUsageLogPanel logs={logs} compact={compact} sidebarRow={sidebarRow} />;
}
