/**
 * P0019 Work Performance — 100% App.tsx embed (source: Tool/P0019-Work-Performance).
 * Sync: node scripts/sync-p0019-todo.cjs
 */
import P0019App from "./p0019/App";
import "./p0019/p0019-shell.css";

export function TodoEmbed() {
  return (
    <div className="todo-p0019-root theme-sky dark relative flex min-h-[28rem] flex-1 flex-col overflow-hidden rounded-xl border border-white/10">
      <P0019App />
    </div>
  );
}
