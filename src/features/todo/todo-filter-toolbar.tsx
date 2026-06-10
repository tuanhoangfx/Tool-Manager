import { useMemo } from "react";
import { Plus } from "lucide-react";
import { HubFilterRowButton } from "@tool-workspace/hub-ui";
import { HubWorkspacePeriodSelect } from "../../components/sales-shell";
import type { TimeRange } from "./components/PerformanceSummary";
import type { Translation } from "./types";
import { useSettings } from "./context/SettingsContext";

type Props = {
  t: Translation;
  onAddTask: () => void;
};

/** Row 1 trailing — Period selector (URL-synced HubPeriodSelect). */
export function TodoSearchToolbar({ t }: Pick<Props, "t">) {
  const { language } = useSettings();

  const labels = useMemo(
    () =>
      ({
        all: t.periodAll,
        today: t.today,
        thisWeek: t.thisWeek,
        last30Days: t.last30Days,
        thisMonth: t.thisMonth,
        customMonth: t.customMonth,
        customRange: t.customRange,
      }) satisfies Partial<Record<TimeRange, string>>,
    [t],
  );

  return (
    <HubWorkspacePeriodSelect
      scope="todo"
      defaultRange="last30Days"
      inactiveKeys={["all", "last30Days"]}
      language={language}
      labels={labels}
      applyLabel={t.save}
    />
  );
}

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
