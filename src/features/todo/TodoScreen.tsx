import { useCallback, useState } from "react";
import { useNotesAuth } from "../notes/useNotesAuth";
import { NotesAuthGate } from "../notes/NotesAuthGate";
import { useModalManager } from "@/todo/hooks/useModalManager";
import { useNotifications } from "@/todo/hooks/useNotifications";
import type { TaskCounts, TodoAdminView } from "@/todo/app-types";
import type { Profile } from "@/todo/types";
import { TodoSettingsProvider } from "./TodoSettingsProvider";
import { TodoChromeProvider } from "./TodoChromeContext";
import { TodoHubChrome, type TodoBoardActions } from "./TodoHubChrome";
import { TodoAppCore } from "./TodoAppCore";
import { setupTodoFilterIcons } from "./todo-filter-icons";
import "./styles/todo-hub-theme.css";

setupTodoFilterIcons();

type Props = {
  tabActive: boolean;
};

const noopBoardActions: TodoBoardActions = {
  onDeleteTask: () => {},
  onUpdateStatus: async () => false,
};

function boardActionsEqual(a: TodoBoardActions, b: TodoBoardActions) {
  return a.onDeleteTask === b.onDeleteTask && a.onUpdateStatus === b.onUpdateStatus;
}

function TodoScreenInner({ tabActive }: Props) {
  const { session, loading, offline, hubEmail } = useNotesAuth();
  const { modals } = useModalManager();
  const { unreadCount, setUnreadCount } = useNotifications(session);
  const [adminView, setAdminView] = useState<TodoAdminView>("myTasks");
  const [taskCounts, setTaskCounts] = useState<TaskCounts>({ todo: 0, inprogress: 0, done: 0 });
  const [boardActions, setBoardActions] = useState<TodoBoardActions>(noopBoardActions);
  const [profileRole, setProfileRole] = useState<string | null>(null);

  const handleBoardActions = useCallback((actions: TodoBoardActions) => {
    setBoardActions((prev) => (boardActionsEqual(prev, actions) ? prev : actions));
  }, []);

  const handleProfileChange = useCallback((role: string | null) => {
    setProfileRole((prev) => (prev === role ? prev : role));
  }, []);

  if (offline) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-[var(--muted)]">
        <p className="text-lg font-medium text-[var(--text)]">Todo requires sign-in</p>
        <p className="mt-2 text-sm">Anonymous mode does not sync tasks. Sign in from the sidebar.</p>
      </div>
    );
  }

  const chromeProps = {
    session,
    profile: profileRole ? ({ role: profileRole } as Pick<Profile, "role">) : null,
    hubEmail,
    adminView,
    onAdminViewChange: setAdminView,
    taskCounts,
    unreadCount,
    boardActions,
    onAddTask: () => modals.task.open(null),
    onOpenActivityLog: modals.activityLog.open,
    onOpenNotifications: modals.notifications.open,
    onEditTask: modals.task.open,
  };

  if (!session && !loading) {
    return (
      <TodoHubChrome {...chromeProps}>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 p-6">
          <NotesAuthGate variant="notes" />
        </div>
      </TodoHubChrome>
    );
  }

  return (
    <TodoHubChrome {...chromeProps}>
      <TodoAppCore
        session={session}
        authLoading={loading}
        tabActive={tabActive}
        adminView={adminView}
        onAdminViewChange={setAdminView}
        taskCounts={taskCounts}
        onTaskCountsChange={setTaskCounts}
        modals={modals}
        setUnreadCount={setUnreadCount}
        onBoardActions={handleBoardActions}
        onProfileRole={handleProfileChange}
      />
    </TodoHubChrome>
  );
}

export function TodoScreen({ tabActive }: Props) {
  return (
    <TodoSettingsProvider>
      <TodoChromeProvider>
        <TodoScreenInner tabActive={tabActive} />
      </TodoChromeProvider>
    </TodoSettingsProvider>
  );
}

export default TodoScreen;
