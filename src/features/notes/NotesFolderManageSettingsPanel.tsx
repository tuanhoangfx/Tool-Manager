import { NotesFolderBulkBarSlot, NotesFolderDirectoryTablePanel } from "./NotesFolderManageContext";

/** Settings → Manage folders — bulk actions + directory table. */
export function NotesFolderManageSettingsPanel() {
  return (
    <div className="space-y-3 text-xs">
      <p className="rounded-lg border border-dashed border-white/10 bg-white/[.02] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--muted)]">
        Select folders in the table, then use Add, Edit, or Delete. Custom folders power filters and the
        colored dot on each note in the left rail.
      </p>
      <NotesFolderBulkBarSlot />
      <NotesFolderDirectoryTablePanel />
    </div>
  );
}
