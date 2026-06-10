import type { ReactNode } from "react";
import { TODO_HUB } from "@/todo/styles/todo-hub-classes";
import type { Task } from "@/todo/types";

type PriorityVariant = Task["priority"];

const PRIORITY_CLASS: Record<PriorityVariant, string> = {
  low: TODO_HUB.badgePriorityLow,
  medium: TODO_HUB.badgePriorityMedium,
  high: TODO_HUB.badgePriorityHigh,
};

type Props =
  | {
      kind: "priority";
      priority: PriorityVariant;
      label: string;
      icon?: ReactNode;
    }
  | {
      kind: "project";
      label: string;
      color: string;
      extraCount?: number;
    }
  | {
      kind: "meta";
      children: ReactNode;
      title?: string;
    }
  | {
      kind: "count";
      children: ReactNode;
    };

/** Hub-UI pill badges for Kanban task cards and filters. */
export function TodoHubBadge(props: Props) {
  if (props.kind === "priority") {
    return (
      <span className={PRIORITY_CLASS[props.priority]}>
        {props.icon ? <span aria-hidden>{props.icon}</span> : null}
        <span className="truncate">{props.label}</span>
      </span>
    );
  }

  if (props.kind === "project") {
    return (
      <span className={TODO_HUB.badgeProject} title={props.label}>
        <span
          className="todo-hub-badge--project-dot"
          style={{ backgroundColor: props.color }}
          aria-hidden
        />
        {props.extraCount != null && props.extraCount > 0 ? (
          <span className={TODO_HUB.badgeCount}>+{props.extraCount}</span>
        ) : null}
        <span className="max-w-[6.5rem] truncate">{props.label}</span>
      </span>
    );
  }

  if (props.kind === "meta") {
    return (
      <span className={TODO_HUB.badgeMeta} title={props.title}>
        {props.children}
      </span>
    );
  }

  return <span className={TODO_HUB.badgeCount}>{props.children}</span>;
}
