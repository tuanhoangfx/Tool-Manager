import { MetricBadge } from "@tool-workspace/hub-ui";
import { formatTaskId } from "../../lib/taskId";
import { TaskSearchHighlightText } from "./TaskSearchHighlightText";

/** P0004 Dashboard ref badge — indigo mono chip (HostingDeployCard golden). */
const TASK_ID_BADGE_VARIANT = "border-indigo-400/35 bg-indigo-500/12 text-indigo-100";

type Props = {
  id: number;
  className?: string;
  highlightTerms?: string[];
};

export function TaskIdBadge({ id, className, highlightTerms = [] }: Props) {
  const label = formatTaskId(id);

  return (
    <MetricBadge
      label={
        highlightTerms.length > 0 ? (
          <TaskSearchHighlightText text={label} terms={highlightTerms} />
        ) : (
          label
        )
      }
      mono
      variantClass={TASK_ID_BADGE_VARIANT}
      className={className}
    />
  );
}

export function TaskIdBadgeInline({ id, highlightTerms = [] }: { id: number; highlightTerms?: string[] }) {
  return (
    <span className="ml-1 inline-block align-middle">
      <TaskIdBadge id={id} highlightTerms={highlightTerms} />
    </span>
  );
}
