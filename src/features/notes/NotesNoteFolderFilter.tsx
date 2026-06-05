import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FilterDef } from "../../components/sales-shell";
import {
  FILTER_DROPDOWN_PANEL_CLASS,
  FILTER_DROPDOWN_ROW_CLASS,
  FilterDropdownCircle,
  FilterDropdownTrigger,
  folderFilterButtonLabel,
} from "../../components/sales-shell/filter-dropdown-ui";
import type { NoteFolder } from "./noteFolders";
import { isSystemFolder } from "./noteFolderLifecycle";
import { NotesFolderGlyph } from "./NotesFolderGlyph";

type Props = {
  folders: NoteFolder[];
  effectiveFolderIds: string[];
  userFolderIds: string[];
  disabled?: boolean;
  onUserFoldersChange: (folderIds: string[]) => void;
};

/** Hub FilterBar-style multi-select — user folders editable; system folders read-only. */
export function NotesNoteFolderFilter({
  folders,
  effectiveFolderIds,
  userFolderIds,
  disabled = false,
  onUserFoldersChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filterDef: FilterDef = useMemo(
    () => ({
      key: "folder",
      label: "Folder",
      showAllLabel: true,
      options: folders.map((f) => ({ value: f.id, label: f.name, color: f.color })),
    }),
    [folders],
  );

  const userOptions = useMemo(() => filterDef.options.filter((o) => !isSystemFolder(o.value)), [filterDef.options]);
  const systemOptions = useMemo(() => filterDef.options.filter((o) => isSystemFolder(o.value)), [filterDef.options]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const filteredUser = userOptions.filter(
    (o) => !search || o.label.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredSystem = systemOptions.filter(
    (o) => !search || o.label.toLowerCase().includes(search.toLowerCase()),
  );

  const displayCount = effectiveFolderIds.length;
  const someUser = userFolderIds.length > 0;

  const soleOpt =
    displayCount === 1 ? filterDef.options.find((o) => o.value === effectiveFolderIds[0]) : undefined;

  const buttonLabel = folderFilterButtonLabel("Folder", displayCount, soleOpt?.label, true);

  const toggleUser = (folderId: string) => {
    if (disabled) return;
    const next = userFolderIds.includes(folderId)
      ? userFolderIds.filter((id) => id !== folderId)
      : [...userFolderIds, folderId];
    onUserFoldersChange(next);
  };

  const toggleAllUser = () => {
    if (disabled) return;
    if (userFolderIds.length === userOptions.length) onUserFoldersChange([]);
    else onUserFoldersChange(userOptions.map((o) => o.value));
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <FilterDropdownTrigger
        active={displayCount > 0}
        open={open}
        label={buttonLabel}
        count={displayCount}
        iconColor={soleOpt?.color}
        disabled={disabled}
        title="Tag note with folders"
        onClick={() => setOpen((v) => !v)}
      />

      {open ? (
        <div className={`${FILTER_DROPDOWN_PANEL_CLASS} right-0`}>
          <div className="border-b border-white/5 p-2">
            <div className="relative">
              <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-[var(--muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search folders…"
                className="field text-xs"
                style={{ paddingLeft: 28, paddingTop: 4, paddingBottom: 4 }}
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-72 overflow-auto p-1">
            {userOptions.length > 0 ? (
              <>
                <button type="button" onClick={toggleAllUser} className={`${FILTER_DROPDOWN_ROW_CLASS} font-medium`}>
                  <FilterDropdownCircle
                    checked={userFolderIds.length === userOptions.length && userOptions.length > 0}
                    indeterminate={someUser && userFolderIds.length < userOptions.length}
                  />
                  <NotesFolderGlyph color="#818cf8" size={12} variant="badge" />
                  <span>All custom folders</span>
                  <span className="ml-auto text-[10px] text-[var(--muted)]">{userOptions.length}</span>
                </button>
                <div className="my-1 border-t border-white/5" />
                {filteredUser.map((o) => {
                  const checked = userFolderIds.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => toggleUser(o.value)}
                      className={FILTER_DROPDOWN_ROW_CLASS}
                    >
                      <FilterDropdownCircle checked={checked} />
                      <NotesFolderGlyph color={o.color ?? "#818cf8"} size={12} variant="badge" />
                      <span className="min-w-0 flex-1 truncate text-left" title={o.label}>
                        {o.label}
                      </span>
                    </button>
                  );
                })}
              </>
            ) : (
              <p className="px-2 py-2 text-[11px] leading-relaxed text-[var(--muted)]">
                No custom folders yet. Create one in Tab Settings → Folders, then tag this note here (works alongside
                automatic <strong className="text-emerald-200/90">New</strong>).
              </p>
            )}

            {filteredSystem.length > 0 ? (
              <>
                <div className="my-1 border-t border-white/5" />
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Automatic
                </p>
                {filteredSystem.map((o) => {
                  const active = effectiveFolderIds.includes(o.value);
                  return (
                    <div
                      key={o.value}
                      className={`${FILTER_DROPDOWN_ROW_CLASS} cursor-default text-[var(--muted)]`}
                      title={
                        o.label === "New"
                          ? "All new notes for 24h — add custom folders above anytime"
                          : o.label === "Unorganized"
                            ? "After New, until you pick a custom folder"
                            : "When a Cookie route is linked"
                      }
                    >
                      <FilterDropdownCircle checked={active} />
                      <NotesFolderGlyph color={o.color ?? "#94a3b8"} size={12} variant="badge" />
                      <span className="min-w-0 flex-1 truncate">{o.label}</span>
                      <span className="shrink-0 rounded border border-white/10 bg-white/[.04] px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide">
                        Auto
                      </span>
                    </div>
                  );
                })}
              </>
            ) : null}

            {filteredUser.length === 0 && filteredSystem.length === 0 ? (
              <div className="py-4 text-center text-xs text-[var(--muted)]">No matches</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
