
import React, { lazy, Suspense } from "react";
import type { Session } from "@supabase/supabase-js";
import type {
  Task,
  Profile,
  Notification,
  ProjectMember,
  ActivityLog,
} from "@/todo/types";
import type { useModalManager } from "@/todo/hooks/useModalManager";
import type { useAppActions } from "@/todo/hooks/useAppActions";
import { useSettings } from "@/todo/context/SettingsContext";
import { useToasts } from "@/todo/context/ToastContext";
import { supabase } from "@/todo/lib/supabase";

const UserGuideModal = lazy(() => import("@/todo/components/UserGuide"));
const TaskModal = lazy(() => import("@/todo/components/TaskModal"));
const ActivityLogModal = lazy(() => import("@/todo/components/ActivityLogModal"));
const NotificationsModal = lazy(() => import("@/todo/components/NotificationsModal"));
const ActionModal = lazy(() => import("@/todo/components/ActionModal"));
const TaskDefaultsModal = lazy(() => import("@/todo/components/task-modal/TaskDefaultsModal"));
const AccountModal = lazy(() => import("@/todo/components/AccountModal"));

interface AppModalsProps {
  session: Session | null;
  profile: Profile | null;
  allUsers: Profile[];
  userProjects: ProjectMember[];
  modals: ReturnType<typeof useModalManager>["modals"];
  taskActions: ReturnType<typeof useAppActions>["taskActions"];
  getProfile: (user: Session["user"]) => Promise<void>;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  handleNotificationClick: (notification: Notification) => Promise<void>;
}

const AppModals: React.FC<AppModalsProps> = ({
  session,
  profile,
  allUsers,
  userProjects,
  modals,
  taskActions,
  getProfile,
  setUnreadCount,
  handleNotificationClick,
}) => {
  const { t } = useSettings();
  const { addToast } = useToasts();

  const handleLogClick = async (log: ActivityLog) => {
    if (!log.task_id) return;

    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(
          "*, assignee:user_id(*), creator:created_by(*), projects:project_id(*), task_attachments(*), task_time_logs(*), task_comments(*, profiles(*))",
        )
        .eq("id", log.task_id)
        .single();

      if (error) {
        if (error.code === "PGRST116") addToast(t.taskNotFound, "error");
        else {
          console.error("Error fetching task for log:", error);
          addToast(`Error loading task: ${error.message}`, "error");
        }
        return;
      }

      if (data) modals.task.open(data as Task, t.activityLog);
    } catch (e: unknown) {
      console.error(e);
      addToast("An unexpected error occurred", "error");
    }
  };

  return (
    <Suspense fallback={null}>
      <AccountModal
        isOpen={modals.account.isOpen}
        onClose={() => {
          modals.account.close();
          if (session) void getProfile(session.user);
        }}
        session={session}
      />
      <UserGuideModal isOpen={modals.userGuide.isOpen} onClose={modals.userGuide.close} />
      <TaskModal
        isOpen={modals.task.isOpen}
        onClose={modals.task.close}
        onSave={async (taskData, newFiles, deletedIds, newComments) => {
          const success = await taskActions.handleSaveTask(
            taskData,
            modals.task.editingTask,
            newFiles,
            deletedIds,
            newComments,
          );
          if (success) modals.task.close();
        }}
        task={modals.task.editingTask}
        openedFrom={modals.task.openedFrom}
        allUsers={allUsers}
        currentUser={profile}
        userProjects={userProjects}
        onOpenDefaults={modals.taskDefaults.open}
      />
      <ActivityLogModal
        isOpen={modals.activityLog.isOpen}
        onClose={modals.activityLog.close}
        onLogClick={handleLogClick}
        session={session}
      />
      <NotificationsModal
        isOpen={modals.notifications.isOpen}
        onClose={modals.notifications.close}
        onNotificationClick={handleNotificationClick}
        setUnreadCount={setUnreadCount}
        session={session}
      />
      <ActionModal
        isOpen={modals.action.isOpen}
        onClose={modals.action.close}
        onConfirm={modals.action.onConfirm}
        title={modals.action.title}
        message={modals.action.message}
        confirmText={modals.action.confirmText}
        confirmButtonClass={modals.action.confirmButtonClass}
      />
      {modals.taskDefaults.isOpen && profile && (
        <TaskDefaultsModal
          isOpen={modals.taskDefaults.isOpen}
          onClose={modals.taskDefaults.close}
          onSave={() => {
            if (session) void getProfile(session.user);
          }}
          currentUser={profile}
          userProjects={userProjects}
        />
      )}
    </Suspense>
  );
};

export default AppModals;
