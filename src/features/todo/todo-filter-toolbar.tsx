import { Plus } from "lucide-react";
import { HubBulkActionButton, HubDirectoryBulkActionRail } from "@tool-workspace/hub-ui";
import type { Translation } from "./types";

type Props = {
  t: Translation;
  onAddTask: () => void;
};

/** Row 2 trailing — New task CTA (golden HubBulkActionButton rail). */
export function TodoFilterRowActions({ onAddTask }: Pick<Props, "onAddTask">) {
  return (
    <HubDirectoryBulkActionRail>
      <HubBulkActionButton
        icon={<Plus size={14} aria-hidden />}
        label="New task"
        title="Create a new task"
        tone="indigo"
        onClick={onAddTask}
      />
    </HubDirectoryBulkActionRail>
  );
}
