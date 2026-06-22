import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ClipboardList, Flag } from "lucide-react";
import {
  HubToolDetailModalPrimaryAction,
  Section,
  SettingsOptionFilter,
  SettingsSubsection,
  compactIconSize,
} from "@tool-workspace/hub-ui";

import { useSettings } from "./context/SettingsContext";
import { useToasts } from "./context/ToastContext";
import { supabase } from "./lib/supabase";
import type { Profile, Project, ProjectMember, Task } from "./types";
import { formatTodoPriorityDisplayLabel } from "./todo-hub-filter-helpers";
import { useTodoChrome } from "./TodoChromeContext";

type Props = {
  profile: Profile;
  userProjects: ProjectMember[];
  onProfileRefresh?: () => void;
};

/** Todo tab Settings — task defaults using golden SettingsOptionFilter + footer Save. */
export function TodoTaskDefaultsSettings({ profile, userProjects, onProfileRefresh }: Props) {
  const { t, defaultDueDateOffset, setDefaultDueDateOffset, defaultPriority, setDefaultPriority } = useSettings();
  const { addToast } = useToasts();
  const chrome = useTodoChrome();
  const [tempDueDateOffset, setTempDueDateOffset] = useState(defaultDueDateOffset);
  const [tempPriority, setTempPriority] = useState<Task["priority"]>(defaultPriority);
  const [tempProjectId, setTempProjectId] = useState("personal");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTempDueDateOffset(defaultDueDateOffset);
    setTempPriority(defaultPriority);
    const latestProject = userProjects.length > 0 ? userProjects[0] : null;
    setTempProjectId(
      profile.default_project_id?.toString() ?? latestProject?.project_id.toString() ?? "personal",
    );
  }, [defaultDueDateOffset, defaultPriority, profile.default_project_id, userProjects]);

  const projectsForSelect = useMemo(
    () => userProjects.map((p) => p.projects).filter((p): p is Project => p != null),
    [userProjects],
  );

  const projectOptions = useMemo(
    () => [
      { id: "personal", name: t.personalProject },
      ...projectsForSelect.map((p) => ({
        id: p.id.toString(),
        name: p.name,
      })),
    ],
    [projectsForSelect, t],
  );

  const priorityLabels: Record<Task["priority"], string> = {
    low: formatTodoPriorityDisplayLabel("low", t),
    medium: formatTodoPriorityDisplayLabel("medium", t),
    high: formatTodoPriorityDisplayLabel("high", t),
  };

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setDefaultDueDateOffset(tempDueDateOffset);
    setDefaultPriority(tempPriority);
    const projectIdToSave = tempProjectId === "personal" ? null : parseInt(tempProjectId, 10);
    const { error } = await supabase
      .from("profiles")
      .update({ default_project_id: projectIdToSave })
      .eq("id", profile.id);
    setIsSaving(false);
    if (error) {
      addToast(`Error saving defaults: ${error.message}`, "error");
      return;
    }
    addToast("Task defaults saved!", "success");
    onProfileRefresh?.();
  }, [
    addToast,
    onProfileRefresh,
    profile.id,
    setDefaultDueDateOffset,
    setDefaultPriority,
    tempDueDateOffset,
    tempPriority,
    tempProjectId,
  ]);

  useEffect(() => {
    chrome.setSettingsFooterActions(
      <HubToolDetailModalPrimaryAction
        label={t.save}
        onClick={() => void handleSave()}
        disabled={isSaving}
        busy={isSaving}
      />,
    );
    return () => chrome.setSettingsFooterActions(null);
  }, [chrome.setSettingsFooterActions, handleSave, isSaving, t.save]);

  return (
    <Section
      label="Task defaults"
      icon={<ClipboardList size={compactIconSize(12)} className="text-orange-300" />}
    >
      <div className="space-y-0">
        <SettingsOptionFilter
          filterKey="todo-default-project"
          title={t.defaultProject}
          icon={Flag}
          iconClassName="text-sky-300"
          options={projectOptions.map((p) => p.id)}
          value={tempProjectId}
          onChange={setTempProjectId}
          formatLabel={(id) => projectOptions.find((p) => p.id === id)?.name ?? id}
        />
        <SettingsOptionFilter
          filterKey="todo-default-priority"
          title={t.priority}
          icon={Flag}
          iconClassName="text-amber-300"
          options={["low", "medium", "high"] as const}
          value={tempPriority}
          onChange={(v) => setTempPriority(v)}
          formatLabel={(p) => priorityLabels[p]}
        />
        <SettingsSubsection
          label={t.defaultDueDateIn}
          icon={<CalendarDays size={compactIconSize(11)} className="text-indigo-300" aria-hidden />}
          className="hub-settings-option-section--compact"
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={tempDueDateOffset}
              onChange={(e) => setTempDueDateOffset(Number(e.target.value))}
              className="field w-20 text-xs"
            />
            <span className="text-[10px] text-[var(--muted)]">{t.days}</span>
          </div>
        </SettingsSubsection>
      </div>
    </Section>
  );
}
