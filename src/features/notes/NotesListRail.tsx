import { useState } from "react";
import { Cookie, Pin } from "lucide-react";
import { resolveCookieSiteIcon } from "../cookie/cookieSiteIcon";
import type { NotesCookieRouteIndex } from "../cookie/useNotesCookieRouteIndex";
import type { NoteListItem } from "./types";
import type { NotesListDensity } from "./notes-list-prefs";

type Props = {
  notes: NoteListItem[];
  selectedId: string | null;
  density: NotesListDensity;
  loading?: boolean;
  refreshing?: boolean;
  cookieRouteByNoteId?: NotesCookieRouteIndex;
  onSelect: (id: string) => void;
};

/** Design V1 — title-only rows, sync dot, cookie route icon, pinned. */
export function NotesListRail({
  notes,
  selectedId,
  density,
  loading,
  refreshing,
  cookieRouteByNoteId,
  onSelect,
}: Props) {
  const compact = density === "compact";

  return (
    <aside className="notes-rail flex h-full min-h-0 w-[15.5rem] shrink-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[var(--panel)]/40">
      <div
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-1.5"
      >
        {loading && notes.length === 0 ? (
          <p className="px-2 py-2 text-[11px] text-[var(--muted)]">Loading…</p>
        ) : null}
        {!loading && notes.length === 0 ? (
          <p className="px-2 py-2 text-[11px] text-[var(--muted)]">No notes match filters.</p>
        ) : null}
        <ul className="space-y-0.5">
          {notes.map((n) => {
            const active = n.id === selectedId;
            const routeDomain = cookieRouteByNoteId?.get(n.id) ?? null;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => onSelect(n.id)}
                  className={`flex w-full items-center gap-1.5 rounded-lg border text-left transition-all ${
                    compact ? "px-1.5 py-1" : "px-2 py-1.5"
                  } ${
                    active
                      ? "border-indigo-400/45 bg-indigo-500/15 ring-1 ring-indigo-400/25"
                      : "border-transparent bg-white/[.02] hover:border-white/10 hover:bg-white/[.05]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      n.syncTone === "emerald"
                        ? "bg-emerald-400"
                        : n.syncTone === "rose"
                          ? "bg-rose-400"
                          : "bg-amber-400"
                    }`}
                    title={n.syncLabel}
                    aria-hidden
                  />
                  <span
                    className={`min-w-0 flex-1 truncate font-medium text-[var(--text)] ${
                      compact ? "text-[11px]" : "text-[12px]"
                    }`}
                  >
                    {displayNoteTitle(n.title)}
                  </span>
                  {routeDomain ? (
                    <CookieRouteMark domain={routeDomain} compact={compact} />
                  ) : null}
                  {n.pinned ? <Pin size={11} className="shrink-0 text-violet-300" aria-label="Pinned" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

function CookieRouteMark({ domain, compact }: { domain: string; compact: boolean }) {
  const site = resolveCookieSiteIcon(domain);
  const [imgFailed, setImgFailed] = useState(false);
  const title = `Cookie Auto route · ${domain}`;
  const box = compact ? "h-3.5 w-3.5" : "h-4 w-4";

  if (site && !imgFailed) {
    return (
      <span className="inline-flex shrink-0 items-center" title={title} aria-label={title}>
        <img
          src={site.src}
          alt=""
          className={`${box} rounded object-contain`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded border border-cyan-400/30 bg-cyan-500/12 text-cyan-200 ${box}`}
      title={title}
      aria-label={title}
    >
      <Cookie size={compact ? 10 : 11} />
    </span>
  );
}

function displayNoteTitle(title: string): string {
  return title.trim() === "Note mới" ? "New note" : title || "Untitled";
}
