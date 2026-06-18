import { ClipboardList } from "lucide-react";
import type { ReactNode } from "react";
import { WorkspaceDirectorySearchToolbar } from "../workspace/WorkspaceDirectorySearchToolbar";

type Props = {
  leading?: ReactNode;
  shown: number;
  total: number;
};

/** Todo FilterBar row-1 toolbar — period · Display · count. */
export function TodoDirectoryToolbar({ leading, shown, total }: Props) {
  return (
    <WorkspaceDirectorySearchToolbar
      screen="todo"
      leading={leading}
      workspacePeriod={{ scope: "todo", defaultRange: "last30Days", inactiveKeys: ["all"] }}
      showTimeRange={false}
      showViewToggle={false}
      showRefresh={false}
      countIcon={ClipboardList}
      shown={shown}
      total={total}
      countLabel="tasks"
    />
  );
}
