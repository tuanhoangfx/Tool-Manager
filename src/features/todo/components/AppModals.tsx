
import React, { lazy, Suspense } from "react";
import type { Session } from "@supabase/supabase-js";
import type {
  Task,
  Profile,
  Notification,
  ProjectMember,
} from "../types";
import type { useModalManager } from "../hooks/useModalManager";
import type { useAppActions } from "../hooks/useAppActions";

const UserGuideModal = lazy(() => import("./UserGuide"));
const TaskModal = lazy(() => import("./TaskModal"));
const NotificationsModal = lazy(() => import("./NotificationsModal"));
const ActionModal = lazy(() => import("./ActionModal"));
const AccountModal = lazy(() => import("./AccountModal"));

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
    </Suspense>
  );
};

export default AppModals;
