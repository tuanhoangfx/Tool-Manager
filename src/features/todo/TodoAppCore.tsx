import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ClipboardListIcon, CheckCircleIcon, SpinnerIcon } from "@/todo/components/Icons";
import { useSettings } from "@/todo/context/SettingsContext";
import { isSupabaseConfigured, supabase } from "@/todo/lib/supabase";
import type { Task, Notification } from "@/todo/types";
import type { DataChange, TaskCounts, TodoAdminView } from "@/todo/app-types";
import type { useModalManager } from "@/todo/hooks/useModalManager";
import { useProfileAndUsers } from "@/todo/hooks/useProfileAndUsers";
import { useAppActions } from "@/todo/hooks/useAppActions";
import useIdleTimer from "@/todo/hooks/useIdleTimer";
import { useProjects } from "@/todo/hooks/useProjects";
import { useRealtime } from "@/todo/hooks/useRealtime";
import { useGlobalShortcuts } from "@/todo/hooks/useGlobalShortcuts";
import { TaskBoardSkeleton } from "@/todo/components/Skeleton";
import { useToasts } from "@/todo/context/ToastContext";
import AppModals from "@/todo/components/AppModals";
import ScrollToTopButton from "@/todo/components/ScrollToTopButton";
import EmployeeDashboard from "@/todo/components/dashboard/employee/EmployeeDashboard";
import AdminTaskDashboard from "@/todo/components/dashboard/admin/AdminTaskDashboard";
import { TodoUsersProvider } from "@/todo/TodoUsersContext";

type Props = {
  session: Session | null;
  authLoading: boolean;
  tabActive: boolean;
  adminView: TodoAdminView;
  onAdminViewChange: (view: TodoAdminView) => void;
  taskCounts: TaskCounts;
  onTaskCountsChange: React.Dispatch<React.SetStateAction<TaskCounts>>;
  modals: ReturnType<typeof useModalManager>["modals"];
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  onBoardActions?: (actions: { onDeleteTask: (task: Task) => void; onUpdateStatus: (task: Task, status: Task["status"]) => Promise<boolean> }) => void;
  onProfileRole?: (role: string | null) => void;
};

export function TodoAppCore({
  session,
  authLoading,
  tabActive,
  adminView,
  onAdminViewChange,
  onTaskCountsChange,
  modals,
  setUnreadCount,
  onBoardActions,
  onProfileRole,
}: Props) {
  const { addToast } = useToasts();
  const { t } = useSettings();
  const locallyUpdatedTaskIds = useRef(new Set<number>());
  const [lastDataChange, setLastDataChange] = useState<DataChange | null>(null);

  const notifyDataChange = useCallback((change: Omit<DataChange, "timestamp">) => {
    setLastDataChange({ ...change, timestamp: Date.now() });
  }, []);

  const { profile, allUsers, loadingProfile, profileError, getProfile } = useProfileAndUsers(session, lastDataChange);

  const { userProjects } = useProjects({
    session,
    profile,
    lastDataChange,
    notifyDataChange,
    closeProjectModal: modals.editProject.close,
  });

  const { activeTimer, taskActions, timerActions } = useAppActions({
    session,
    setActionModal: modals.action.setState,
    notifyDataChange,
    t,
    locallyUpdatedTaskIds,
  });

  const canAddTask = !!(session && profile);
  useRealtime({ session, locallyUpdatedTaskIds, notifyDataChange });
  useGlobalShortcuts({ modals, canAddTask, enabled: tabActive });

  const handleIdle = useCallback(() => {
    if (session && navigator.onLine) {
      notifyDataChange({ type: "batch_update", payload: { reason: "idle_refresh" } });
      addToast(t.dataRefreshed, "info");
    }
  }, [session, notifyDataChange, addToast, t.dataRefreshed]);

  useIdleTimer(handleIdle, 5 * 60 * 1000);

  useEffect(() => {
    if (!session) {
      onTaskCountsChange((prev) =>
        prev.todo === 0 && prev.inprogress === 0 && prev.done === 0
          ? prev
          : { todo: 0, inprogress: 0, done: 0 },
      );
    }
  }, [session, onTaskCountsChange]);

  const handleNotificationClick = useCallback(
    async (notification: Notification) => {
      if (
        (notification.type === "new_task_assigned" || notification.type === "new_comment") &&
        notification.data?.task_id
      ) {
        try {
          const { data, error } = await supabase
            .from("tasks")
            .select(
              "*, assignee:user_id(*), creator:created_by(*), projects:project_id(*), task_attachments(*), task_time_logs(*), task_comments(*, profiles(*))",
            )
            .eq("id", notification.data.task_id)
            .single();
          if (error) {
            if (error.code === "PGRST116")
              modals.action.setState({ isOpen: true, title: t.taskNotFound, message: t.taskDeleted });
            else throw error;
          } else if (data) {
            modals.task.open(data as Task, t.notifications);
          }
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          modals.action.setState({
            isOpen: true,
            title: "Error",
            message: `Could not load task: ${msg}`,
          });
        }
      }
    },
    [modals, t],
  );

  useEffect(() => {
    onProfileRole?.(profile?.role ?? null);
  }, [profile?.role, onProfileRole]);

  useEffect(() => {
    onBoardActions?.({
      onDeleteTask: taskActions.handleDeleteTask,
      onUpdateStatus: taskActions.handleUpdateStatus,
    });
  }, [onBoardActions, taskActions.handleDeleteTask, taskActions.handleUpdateStatus]);

  if (!isSupabaseConfigured) {
    return (
      <div className="flex flex-grow flex-col items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 p-8 text-center">
        <h2 className="text-2xl font-bold text-amber-300">Supabase Not Configured</h2>
        <p className="mt-4 text-[var(--muted)]">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local</p>
      </div>
    );
  }

  if (authLoading || (session && loadingProfile)) {
    return (
      <div className="h-full w-full">
        <TaskBoardSkeleton />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-grow animate-fadeIn flex-col items-center justify-center p-4 text-center">
        <div className="mx-auto mb-8 w-full max-w-xs">
          <div className="mb-2 flex items-center justify-between text-center">
            <div className="w-24 text-center">
              <ClipboardListIcon size={28} className="mx-auto text-orange-400" />
              <span className="mt-2 block text-sm font-semibold">{t.todo}</span>
            </div>
            <div className="w-24 text-center">
              <SpinnerIcon size={28} className="mx-auto animate-spin text-indigo-400" />
              <span className="mt-2 block text-sm font-semibold">{t.inprogress}</span>
            </div>
            <div className="w-24 text-center">
              <CheckCircleIcon size={28} className="mx-auto text-green-400" />
              <span className="mt-2 block text-sm font-semibold">{t.done}</span>
            </div>
          </div>
          <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel-2)]">
            <div className="animate-progress-fill h-full rounded-full bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)]" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-[var(--text)]">{t.signInToManageTasks}</h2>
        <p className="mt-2 text-[var(--muted)]">
          Track progress, manage deadlines, and collaborate seamlessly.
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-xl text-red-400">Could not load user profile. Please try again.</p>
        {profileError ? (
          <p className="max-w-md text-sm text-[var(--muted)]">{profileError}</p>
        ) : null}
        {session?.user ? (
          <button
            type="button"
            className="hub-btn hub-btn--primary"
            onClick={() => void getProfile(session.user)}
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  const isMyTasksVisible =
    profile.role === "employee" ||
    ((profile.role === "admin" || profile.role === "manager") && adminView === "myTasks");
  const dummySetTaskCounts = () => {};

  return (
    <TodoUsersProvider allUsers={allUsers}>
      <div className="todo-board-root relative flex min-h-0 flex-1 flex-col">
        {!tabActive ? null : (
          <>
            <div className="flex min-h-0 flex-1 flex-col">
              <div className={isMyTasksVisible ? "block" : "hidden"}>
                <EmployeeDashboard
                  session={session}
                  lastDataChange={lastDataChange}
                  onEditTask={modals.task.open}
                  onDeleteTask={taskActions.handleDeleteTask}
                  onClearCancelledTasks={taskActions.handleClearCancelledTasks}
                  onUpdateStatus={taskActions.handleUpdateStatus}
                  onStartTimer={timerActions.handleStartTimer}
                  onStopTimer={timerActions.handleStopTimer}
                  activeTimer={activeTimer}
                  allUsers={allUsers}
                  setTaskCounts={isMyTasksVisible ? onTaskCountsChange : dummySetTaskCounts}
                  userProjects={userProjects}
                />
              </div>

              {(profile.role === "admin" || profile.role === "manager") && (
                <div className={adminView === "taskDashboard" ? "block" : "hidden"}>
                  <AdminTaskDashboard
                    profile={profile}
                    lastDataChange={lastDataChange}
                    allUsers={allUsers}
                    onEditTask={modals.task.open}
                    onDeleteTask={taskActions.handleDeleteTask}
                    onClearCancelledTasks={taskActions.handleClearCancelledTasks}
                    onUpdateStatus={taskActions.handleUpdateStatus}
                    onStartTimer={timerActions.handleStartTimer}
                    onStopTimer={timerActions.handleStopTimer}
                    activeTimer={activeTimer}
                    setTaskCounts={adminView === "taskDashboard" ? onTaskCountsChange : dummySetTaskCounts}
                  />
                </div>
              )}
            </div>

            <div className="pointer-events-none fixed bottom-4 right-4 z-40 flex flex-col gap-2">
              <ScrollToTopButton />
            </div>
          </>
        )}

        <AppModals
          session={session}
          profile={profile}
          allUsers={allUsers}
          userProjects={userProjects}
          modals={modals}
          taskActions={taskActions}
          getProfile={getProfile}
          setUnreadCount={setUnreadCount}
          handleNotificationClick={handleNotificationClick}
        />
      </div>
    </TodoUsersProvider>
  );
}
