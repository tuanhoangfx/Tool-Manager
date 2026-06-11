import { Plus } from "lucide-react";
import { HubFilterRowButton } from "@tool-workspace/hub-ui";
import type { Translation } from "./types";

type Props = {
  t: Translation;
  onAddTask: () => void;
};

/** Row 2 trailing — New task CTA (golden Notes "New" on filter row). */
export function TodoFilterRowActions({ onAddTask }: Pick<Props, "onAddTask">) {
  return (
    <HubFilterRowButton
      icon={<Plus size={12} />}
      label="New"
      tone="indigo"
      onClick={onAddTask}
    />
  );
}
