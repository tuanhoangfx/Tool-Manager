import { Cookie, FileInput } from "lucide-react";
import { formatCookieSnapshotMarkdown } from "./noteUtils";

type Props = {
  lines: string[];
  syncStatus: string;
  syncedAt: string | null;
  bodyMd: string;
  onInsertIntoMarkdown: (nextBody: string) => void;
};

/** Optional cookie snapshot panel above Markdown (non-route notes). */
export function NoteCookieSnapshotBlock({
  lines,
  syncStatus,
  syncedAt,
  bodyMd,
  onInsertIntoMarkdown,
}: Props) {
  const canInsert = lines.length > 0 && !bodyMd.trim();

  return (
    <section className="fm-cookie-panel">
      <header className="fm-cookie-panel__head">
        <span className="fm-cookie-panel__title">
          <Cookie size={12} /> Cookie snapshot
        </span>
        <span className={`fm-badge fm-badge--sm ${syncStatus === "synced" ? "fm-badge--ok" : ""}`}>
          {syncStatus}
          {lines.length ? ` · ${lines.length}` : ""}
        </span>
      </header>
      <p className="fm-cookie-panel__hint">
        Extension sync fills <strong>cookie snapshot</strong> (masked values). Markdown below is your note content —
        optional.
      </p>
      <ul className="fm-cookie-panel__list">
        {lines.length ? (
          lines.map((line) => (
            <li key={line} className="text-[11px] text-indigo-200/90">
              {line}
            </li>
          ))
        ) : (
          <li className="text-[11px] text-[var(--muted)]">No snapshot yet — Cookie sync → Link extension → Sync in browser.</li>
        )}
      </ul>
      {syncedAt ? (
        <p className="text-[10px] text-[var(--muted)]">Last synced: {new Date(syncedAt).toLocaleString()}</p>
      ) : null}
      {canInsert ? (
        <button
          type="button"
          className="btn-ghost btn mt-2 w-full text-[11px]"
          onClick={() => onInsertIntoMarkdown(formatCookieSnapshotMarkdown(lines) + bodyMd)}
        >
          <FileInput size={12} />
          Insert masked summary into Markdown
        </button>
      ) : null}
    </section>
  );
}
