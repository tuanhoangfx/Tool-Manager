import { ClipboardList } from "lucide-react";
import type { ReactNode } from "react";
import { DirectorySearchToolbar } from "@tool-workspace/hub-ui";

type Props = {
  leading?: ReactNode;
  shown: number;
  total: number;
};

/** Todo FilterBar row-1 toolbar — golden DirectorySearchToolbar (period · view toggle · count). */
export function TodoDirectoryToolbar({ leading, shown, total }: Props) {
  return (
    <DirectorySearchToolbar
      leading={leading}
      workspacePeriod={{ scope: "todo", defaultRange: "last30Days", inactiveKeys: ["all"] }}
      showTimeRange={false}
      showViewToggle={false}
      showTablePageSize={false}
      showRefresh={false}
      countIcon={ClipboardList}
      shown={shown}
      total={total}
      countLabel="tasks"
    />
  );
}
