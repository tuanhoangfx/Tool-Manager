import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Bell, ClipboardList, History, Plus } from "lucide-react";
import {
  FilterBar,
  HubTabChrome,
  HubTabScreenBody,
  MiniBarChart,
  useHubChromePrefs,
  useResolvedVisibleChartKeys,
  useResolvedVisibleKpiKeys,
  WorkspaceTabHeader,
} from "@tool-workspace/hub-ui";
import type { Session } from "@supabase/supabase-js";
import { useSettings } from "@/todo/context/SettingsContext";
import { supabase } from "@/todo/lib/supabase";
import TaskPreviewPopover from "@/todo/components/dashboard/TaskPreviewPopover";
import TimeRangeSelect from "@/todo/components/performance-summary/TimeRangeSelect";
import { TodoFilterDateExtensions } from "@/todo/components/TodoFilterDateExtensions";
import { useTodoChrome } from "@/todo/TodoChromeContext";
import {
  DEFAULT_TODO_CHART_KEYS,
  DEFAULT_TODO_HEADER_STAT_KEYS,
  DEFAULT_TODO_KPI_KEYS,
  TODO_CHART_DEFS,
  TODO_KPI_DEFS,
} from "@/todo/todo-display-prefs";
import { buildTodoHeaderStats } from "@/todo/todo-header-stats";
import {
  filterValuesToTodoFilters,
  todoFiltersToFilterValues,
} from "@/todo/todo-filters";
import { readTodoHubPrefs } from "@/todo/todo-tab-prefs";
import type { TaskCounts, TodoAdminView } from "@/todo/app-types";
import type { Profile, Task } from "@/todo/types";
import { subscribeHubListPrefs } from "../../lib/url-prefs";
import { WorkspaceHeaderActions } from "../workspace/WorkspaceHeaderActions";
import { workspaceVersionLine } from "../workspace/workspace-tab-header-meta";
import { TodoViewToggle } from "./TodoViewToggle";
import type { TimeRange } from "@/todo/components/PerformanceSummary";

export type TodoBoardActions = {
  onDeleteTask: (task: Task) => void;
  onUpdateStatus: (task: Task, status: Task["status"]) => Promise<boolean> | void;
};

type Props = {
  session: Session | null;
  profile: Pick<Profile, "role"> | null;
  hubEmail: string | null;
  adminView: TodoAdminView;
  onAdminViewChange: (view: TodoAdminView) => void;
  taskCounts: TaskCounts;
  unreadCount: number;
  boardActions: TodoBoardActions;
  onAddTask: () => void;
  onOpenActivityLog: () => void;
  onOpenNotifications: () => void;
  onEditTask: (task: Task | Partial<Task> | null) => void;
  children: ReactNode;
};

export function TodoHubChrome({
  session,
  profile,
  hubEmail,
  adminView,
  onAdminViewChange,
  taskCounts,
  unreadCount,
  boardActions,
  onAddTask,
  onOpenActivityLog,
  onOpenNotifications,
  onEditTask,
  children,
}: Props) {
  const { t } = useSettings();
  const version = useMemo(() => workspaceVersionLine(), []);
  const showAdminViews = profile?.role === "admin" || profile?.role === "manager";
  const { searchPin, headerPin, stackChrome } = useHubChromePrefs();

  const [activePreview, setActivePreview] = useState<Task["status"] | null>(null);
  const [previewTasks, setPreviewTasks] = useState<Task[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const chrome = useTodoChrome();
  const [hubPrefs, setHubPrefs] = useState(readTodoHubPrefs);

  useEffect(() => subscribeHubListPrefs(() => setHubPrefs(readTodoHubPrefs())), []);

  const visHeaderStats = hubPrefs.headerStats ?? DEFAULT_TODO_HEADER_STAT_KEYS;
  const visKpi = useResolvedVisibleKpiKeys(hubPrefs.kpi, DEFAULT_TODO_KPI_KEYS, TODO_KPI_DEFS);
  const visCharts = useResolvedVisibleChartKeys(hubPrefs.charts, DEFAULT_TODO_CHART_KEYS, TODO_CHART_DEFS);

  const filteredKpis = useMemo(
    () => chrome.kpis?.filter((k) => k.prefKey && visKpi.has(k.prefKey)),
    [chrome.kpis, visKpi],
  );

  const chartsBand = useMemo(() => {
    if (!chrome.chartData) return undefined;
    const hasCharts = visCharts.has("status_bar") || visCharts.has("priority_bar");
    if (!hasCharts) return undefined;
    return (
      <>
        {visCharts.has("status_bar") ? (
          <MiniBarChart title="Tasks by status" items={chrome.chartData.statusItems} />
        ) : null}
        {visCharts.has("priority_bar") ? (
          <MiniBarChart title="Tasks by priority" items={chrome.chartData.priorityItems} />
        ) : null}
      </>
    );
  }, [chrome.chartData, visCharts]);

  const chartCount = useMemo(() => {
    let n = 0;
    if (visCharts.has("status_bar")) n++;
    if (visCharts.has("priority_bar")) n++;
    return n || undefined;
  }, [visCharts]);

  const handleStatClick = useCallback((status: Task["status"]) => {
    setActivePreview((current) => (current === status ? null : status));
  }, []);

  const centerStats = useMemo(
    () =>
      session
        ? buildTodoHeaderStats(taskCounts, {
            onStatClick: handleStatClick,
            activeStatus: activePreview,
            visibleKeys: visHeaderStats,
          })
        : [],
    [session, taskCounts, handleStatClick, activePreview, visHeaderStats],
  );

  useEffect(() => {
    if (!activePreview || !session) {
      setPreviewTasks([]);
      return;
    }
    const fetchPreviewTasks = async () => {
      setIsLoadingPreview(true);
      const { data, error } = await supabase
        .from("tasks")
        .select(
          "*, assignee:user_id(*), creator:created_by(*), projects:project_id(*), task_attachments(*), task_time_logs(*), task_comments(*, profiles(*))",
        )
        .or(`user_id.eq.${session.user.id},created_by.eq.${session.user.id}`)
        .eq("status", activePreview)
        .order("priority", { ascending: false });
      if (error) {
        console.error("Error fetching preview tasks:", error);
        setPreviewTasks([]);
      } else {
        setPreviewTasks(data as Task[]);
      }
      setIsLoadingPreview(false);
    };
    void fetchPreviewTasks();
  }, [activePreview, session]);

  const popoverTitle =
    activePreview === "todo"
      ? t.tasksTodo
      : activePreview === "inprogress"
        ? t.tasksInProgress
        : t.tasksDone;

  const trailing = (
    <div className="flex items-center gap-1">
      {session && profile && (
        <>
          <TodoViewToggle
            activeView={adminView}
            onViewChange={onAdminViewChange}
            showAdminViews={showAdminViews}
          />
          <button
            type="button"
            onClick={onAddTask}
            className="hub-icon-btn text-[var(--accent)]"
            title="Add task"
            aria-label="Add task"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            onClick={onOpenActivityLog}
            className="hub-icon-btn"
            title="Activity log"
            aria-label="Activity log"
          >
            <History size={16} />
          </button>
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative hub-icon-btn"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </>
      )}
    </div>
  );

  const header = (
    <WorkspaceTabHeader
      ariaLabel="Todo header"
      titleIcon={ClipboardList}
      titleIconClass="text-orange-400"
      title="Todo"
      versionLine={version.line}
      versionLive={version.live}
      extraMetaItems={
        hubEmail || session?.user?.email
          ? [{ icon: ClipboardList, value: hubEmail ?? session?.user?.email ?? "" }]
          : undefined
      }
      centerStats={centerStats}
      actions={
        <WorkspaceHeaderActions
          screen="todo"
          screenFilters={chrome.filterDefs}
          trailing={trailing}
        />
      }
      pinSticky={stackChrome ? false : headerPin}
      dividerBelow={stackChrome ? false : !searchPin}
      embedded={stackChrome}
    />
  );

  const timeRangeOptions = useMemo(
    () =>
      [
        { value: "today" as TimeRange, label: t.today },
        { value: "thisWeek" as TimeRange, label: t.thisWeek },
        { value: "last30Days" as TimeRange, label: t.last30Days },
        { value: "thisMonth" as TimeRange, label: t.thisMonth },
        { value: "customMonth" as TimeRange, label: t.customMonth },
        { value: "customRange" as TimeRange, label: t.customRange },
      ] as const,
    [t],
  );

  const filterBar =
    session && profile ? (
      <div className="space-y-2">
        <FilterBar
          shortcutScope="todo"
          layout="hub"
          pinSticky={searchPin && !stackChrome}
          headerPinned={headerPin}
          embedded={stackChrome}
          placeholder={t.searchPlaceholder}
          filters={chrome.filterDefs}
          query={chrome.filters.searchTerm}
          onQueryChange={(q) => chrome.setFilters((prev) => ({ ...prev, searchTerm: q }))}
          values={todoFiltersToFilterValues(chrome.filters)}
          onValuesChange={(next) =>
            chrome.setFilters((prev) => filterValuesToTodoFilters(next, prev, chrome.filterDefs))
          }
          toolbar={chrome.directoryToolbar ?? undefined}
          row2Leading={chrome.filterRowLeading ?? undefined}
          row2Actions={
            <TimeRangeSelect
              value={chrome.timeRange}
              onChange={chrome.setTimeRange}
              options={[...timeRangeOptions]}
            />
          }
        />
        <TodoFilterDateExtensions />
      </div>
    ) : undefined;

  return (
    <div className="todo-board-root flex min-h-0 min-w-0 flex-1 flex-col">
      <HubTabChrome header={header} filterBar={filterBar}>
        <HubTabScreenBody
          kpis={session ? filteredKpis : undefined}
          charts={session ? chartsBand : undefined}
          chartCount={session ? chartCount : undefined}
          sectionRuleLabel={session ? chrome.sectionRuleLabel : undefined}
          bodyFlex
        >
          {children}
        </HubTabScreenBody>
      </HubTabChrome>

      {session ? (
        <TaskPreviewPopover
          isOpen={!!activePreview}
          onClose={() => setActivePreview(null)}
          title={`${popoverTitle} (${previewTasks.length})`}
          tasks={previewTasks}
          isLoading={isLoadingPreview}
          onEditTask={onEditTask}
          onDeleteTask={boardActions.onDeleteTask}
          onUpdateStatus={boardActions.onUpdateStatus}
        />
      ) : null}
    </div>
  );
}
