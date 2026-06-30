/**
 * Todo embed body — no shell providers/main (host supplies AuthSessionProvider + main).
 */
import { Suspense } from "react";
import { HubLoaderRoot, WorkspaceLoadingView } from "../components/sales-shell";
import { ToastContainer, ToastProvider } from "../components/toast";
import { AuthSessionProvider, useNotesAuth } from "../features/notes/AuthSessionProvider";
import { NotesAuthGate } from "../features/notes/NotesAuthGate";
import { TodoScreen } from "../features/todo/TodoScreen";
import "./p0020-todo-embed.css";

export function TodoScreenEmbed() {
  const { session, loading: authLoading } = useNotesAuth();

  if (!session && !authLoading) {
    return <NotesAuthGate variant="notes" />;
  }

  if (!session && authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-[12px] text-[var(--muted)]">
        Signing in…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <Suspense fallback={<WorkspaceLoadingView screen="todo" enabled />}>
        <TodoScreen tabActive />
      </Suspense>
    </div>
  );
}

/** Standalone embed with providers — legacy / direct mount. */
export function TodoScreenRoot() {
  return (
    <AuthSessionProvider>
      <ToastProvider>
        <main className="hub-main flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
          <HubLoaderRoot />
          <TodoScreenEmbed />
        </main>
        <ToastContainer />
      </ToastProvider>
    </AuthSessionProvider>
  );
}
