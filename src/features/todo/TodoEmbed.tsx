/**
 * P0019 Work Performance — 100% App.tsx embed (source: Tool/P0019-Work-Performance).
 * Sync: node scripts/sync-p0019-todo.cjs
 */
import { useEffect } from "react";
import P0019App from "./p0019/App";
import "./p0019/p0019-shell.css";
import { useNotesAuth } from "../notes/useNotesAuth";
import { NotesAuthGate } from "../notes/NotesAuthGate";

export function TodoEmbed() {
  const { session, loading, offline } = useNotesAuth();

  useEffect(() => {
    if (!session) return;
    // Force P0019 embed to English for Tool UI consistency.
    try {
      if (window.localStorage.getItem("language") !== "en") window.localStorage.setItem("language", "en");
    } catch {
      /* ignore */
    }
  }, [session]);

  if (loading) {
    return (
      <div className="flex min-h-[12rem] flex-1 items-center justify-center text-sm text-[var(--muted)]">
        Loading…
      </div>
    );
  }
  if (offline) {
    return (
      <div className="auth-inline anim-fade flex flex-1 items-start">
        <div className="auth-inline-card">
          <div className="auth-inline-title">Todo is not available in offline mode.</div>
          <div className="auth-inline-sub">
            Turn off offline mode in Settings → General, or sign in online to sync tasks with Supabase.
          </div>
        </div>
      </div>
    );
  }
  if (!session) return <NotesAuthGate variant="todo" />;

  return (
    <div className="todo-p0019-root theme-sky dark relative flex min-h-[20rem] flex-1 flex-col overflow-hidden rounded-xl border border-white/10">
      <P0019App />
    </div>
  );
}
