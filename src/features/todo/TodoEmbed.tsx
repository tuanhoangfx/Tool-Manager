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
  const { session } = useNotesAuth();
  if (!session) return <NotesAuthGate variant="todo" />;
  useEffect(() => {
    // Force P0019 embed to English for Tool UI consistency.
    try {
      if (window.localStorage.getItem("language") !== "en") window.localStorage.setItem("language", "en");
    } catch {
      /* ignore */
    }
  }, []);
  return (
    <div className="todo-p0019-root theme-sky dark relative flex min-h-[28rem] flex-1 flex-col overflow-hidden rounded-xl border border-white/10">
      <P0019App />
    </div>
  );
}
