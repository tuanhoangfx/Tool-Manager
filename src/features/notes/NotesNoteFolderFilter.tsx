import { Search } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FilterDef } from "../../components/sales-shell";
import {
  folderFilterButtonLabel,
  HUB_FILTER_DROPDOWN_PANEL_PORTAL_CLASS,
  HUB_FILTER_DROPDOWN_ROW_CLASS,
  HubFilterDropdownCircle,
  HubFilterDropdownTrigger,
  compactIconSize,
  multiFilterTriggerTitle,
} from "@tool-workspace/hub-ui";

import type { NoteFolder } from "./noteFolders";
import { isSystemFolder } from "./noteFolderLifecycle";
import { NotesFolderGlyph } from "./NotesFolderGlyph";

type PanelPos = { top: number; left: number; width: number };

const PANEL_WIDTH = 288;

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
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const filterDef: FilterDef = useMemo(
    () => ({
      key: "folder",
      label: "Folder",
      options: folders.map((f) => ({ value: f.id, label: f.name, color: f.color })),
    }),
    [folders],
  );

  const userOptions = useMemo(() => filterDef.options.filter((o) => !isSystemFolder(o.value)), [filterDef.options]);
  const systemOptions = useMemo(() => filterDef.options.filter((o) => isSystemFolder(o.value)), [filterDef.options]);

  useLayoutEffect(() => {
    if (!open || !ref.current) {
      setPanelPos(null);
      return;
    }
    const update = () => {
      const rect = ref.current!.getBoundingClientRect();
      const left = rect.right - PANEL_WIDTH;
      setPanelPos({ top: rect.bottom + 4, left, width: PANEL_WIDTH });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
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
  const buttonTitle =
    displayCount > 1
      ? multiFilterTriggerTitle(effectiveFolderIds, filterDef.options) ?? "Tag note with folders"
      : soleOpt?.label ?? "Tag note with folders";

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

  const panel =
    open && panelPos ? (
      <div
        ref={panelRef}
        className={HUB_FILTER_DROPDOWN_PANEL_PORTAL_CLASS}
        style={{ top: panelPos.top, left: panelPos.left, width: panelPos.width }}
      >
        <div className="border-b border-white/5 p-2">
          <div className="relative">
            <Search
              size={compactIconSize(12)}
              className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-[var(--muted)]"
              aria-hidden
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search folders…"
              className="field text-xs"
              style={{ paddingLeft: 25, paddingTop: 4, paddingBottom: 4 }}
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-72 overflow-auto p-1">
          {userOptions.length > 0 ? (
            <>
              <button type="button" onClick={toggleAllUser} className={`${HUB_FILTER_DROPDOWN_ROW_CLASS} font-medium`}>
                <HubFilterDropdownCircle
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
                    className={HUB_FILTER_DROPDOWN_ROW_CLASS}
                  >
                    <HubFilterDropdownCircle checked={checked} />
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
                    className={`${HUB_FILTER_DROPDOWN_ROW_CLASS} cursor-default text-[var(--muted)]`}
                    title={
                      o.label === "New"
                        ? "All new notes for 24h — add custom folders above anytime"
                        : o.label === "Unorganized"
                          ? "After New, until you pick a custom folder"
                          : "When a Cookie route is linked"
                    }
                  >
                    <HubFilterDropdownCircle checked={active} />
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
    ) : null;

  return (
    <div ref={ref} className="relative shrink-0">
      <HubFilterDropdownTrigger
        active={displayCount > 0}
        open={open}
        label={buttonLabel}
        iconColor={soleOpt?.color}
        disabled={disabled}
        title={buttonTitle}
        onClick={() => setOpen((v) => !v)}
      />

      {typeof document !== "undefined" && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
