import { Cookie, FileInput } from "lucide-react";
import { formatCookieSnapshotMarkdown } from "./noteUtils";

type Props = {
  lines: string[];
  syncStatus: string;
  syncedAt: string | null;
  bodyMd: string;
  onInsertIntoMarkdown: (nextBody: string) => void;
  /** Cookie route owns snapshot — no copy into Markdown. */
  routeLocked?: boolean;
};

/** Full cookie snapshot in note column — sync writes here, not into Markdown by default. */
export function NoteCookieSnapshotBlock({
  lines,
  syncStatus,
  syncedAt,
  bodyMd,
  onInsertIntoMarkdown,
  routeLocked = false,
}: Props) {
  const canInsert = !routeLocked && lines.length > 0 && !bodyMd.trim();

  return (
    <section className={`fm-cookie-panel ${routeLocked ? "fm-cookie-panel--locked" : ""}`}>
      {!routeLocked ? (
        <header className="fm-cookie-panel__head">
          <span className="fm-cookie-panel__title">
            <Cookie size={12} /> Cookie snapshot
          </span>
          <span className={`fm-badge fm-badge--sm ${syncStatus === "synced" ? "fm-badge--ok" : ""}`}>
            {syncStatus}
            {lines.length ? ` · ${lines.length}` : ""}
          </span>
        </header>
      ) : null}
      {!routeLocked ? (
        <p className="fm-cookie-panel__hint">
          Extension sync fills <strong>cookie snapshot</strong> (masked values). Markdown below is your note content —
          optional.
        </p>
      ) : null}
      <ul className="fm-cookie-panel__list">
        {lines.length ? (
          lines.map((line) => (
            <li key={line} className="font-mono text-[10px] text-indigo-200/90">
              {line}
            </li>
          ))
        ) : (
          <li className="text-[11px] text-[var(--muted)]">No snapshot yet — Cookie sync → Link extension → Sync in browser.</li>
        )}
      </ul>
      {!routeLocked && syncedAt ? (
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
