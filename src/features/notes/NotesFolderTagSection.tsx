import { FolderOpen, StickyNote } from "lucide-react";
import { Section, SectionIcon } from "@tool-workspace/hub-ui";
import type { NoteFolder } from "./noteFolders";
import {
  isCookieAutoFolder,
  isNewFolder,
  isUnorganizedFolder,
} from "./noteFolderLifecycle";

type Props = {
  folders: NoteFolder[];
  selectedNoteId: string | null;
  selectedNoteFolderIds: string[];
  cookieRouteNoteIds: ReadonlySet<string>;
  onToggleNoteFolder: (folderId: string, enabled: boolean) => Promise<void>;
};

/** Display panel — quick tag chips for the selected note. */
export function NotesFolderTagSection({
  folders,
  selectedNoteId,
  selectedNoteFolderIds,
  cookieRouteNoteIds,
  onToggleNoteFolder,
}: Props) {
  const noteHasCookieRoute = Boolean(selectedNoteId && cookieRouteNoteIds.has(selectedNoteId));

  return (
    <Section icon={<SectionIcon icon={StickyNote} className="text-indigo-300" />} label="Tag this note">
      {!selectedNoteId ? (
        <p className="rounded-lg border border-dashed border-white/10 bg-white/[.02] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--muted)]">
          Select a note, then tap a folder chip to tag it.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {folders.map((folder) => {
            const active = selectedNoteFolderIds.includes(folder.id);
            const autoLocked =
              (isCookieAutoFolder(folder.id) && noteHasCookieRoute) ||
              isNewFolder(folder.id) ||
              isUnorganizedFolder(folder.id);
            const chipDisabled = !selectedNoteId || autoLocked;
            return (
              <button
                key={`tag-${folder.id}`}
                type="button"
                disabled={chipDisabled}
                title={
                  autoLocked
                    ? isNewFolder(folder.id)
                      ? "Auto — new notes stay here for 24h"
                      : isUnorganizedFolder(folder.id)
                        ? "Auto — notes without a custom folder after New"
                        : "Auto — note has a Cookie Bridge route"
                    : undefined
                }
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                  active
                    ? "border-indigo-400/35 bg-indigo-500/14 text-indigo-100"
                    : "border-white/10 bg-white/[.03] text-[var(--muted)]"
                } disabled:cursor-default disabled:opacity-85`}
                onClick={() => {
                  if (chipDisabled || !selectedNoteId) return;
                  void onToggleNoteFolder(folder.id, !active);
                }}
              >
                <FolderOpen
                  size={12}
                  className="shrink-0"
                  style={{ color: folder.color }}
                  aria-hidden
                />
                {folder.name}
                {autoLocked ? (
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-200/90">Auto</span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </Section>
  );
}
