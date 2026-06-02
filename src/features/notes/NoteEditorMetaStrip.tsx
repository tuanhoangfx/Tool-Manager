import {
  AlertCircle,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Globe2,
  Hash,
  Pin,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NoteEditorTitleOnlyBadge } from "./NoteEditorRouteTitleActions";
import { syncMeta } from "./noteUtils";
import type { NoteRow } from "./types";

type MetaTone = "amber" | "cyan" | "emerald" | "indigo" | "muted" | "rose" | "violet";

type Props = {
  note: NoteRow | null;
  loading?: boolean;
  /** Route notes show domain on title row — hide duplicate globe chip. */
  hideDomain?: boolean;
  /** Cookie Auto route lock — title-only editing hint in meta row. */
  routeLocked?: boolean;
};

/** Editor header meta chips (sync, domain, pin, id). */
export function NoteEditorMetaStrip({ note, loading, hideDomain = false, routeLocked = false }: Props) {
  if (!note && !loading && !routeLocked) return null;

  const sync = note ? syncMeta(note.sync_status, note.synced_at) : null;
  const syncTone: MetaTone =
    sync?.syncTone === "emerald" ? "emerald" : sync?.syncTone === "rose" ? "rose" : "amber";
  const updatedLabel = note?.updated_at ? formatShortDate(note.updated_at) : "";

  return (
    <div className="ml-auto flex min-h-[1.625rem] min-w-[5.5rem] shrink-0 flex-wrap items-center justify-end gap-1.5">
      {routeLocked ? <NoteEditorTitleOnlyBadge /> : null}
      {loading ? <MetaChip icon={<Clock3 size={11} />} label="Loading" tone="indigo" /> : null}
      {note?.domain?.trim() && !hideDomain ? (
        <MetaChip icon={<Globe2 size={11} />} label={note.domain.trim()} tone="cyan" title="Cookie domain" />
      ) : null}
      {sync ? (
        <MetaChip
          icon={note?.sync_status === "error" ? <AlertCircle size={11} /> : <CheckCircle2 size={11} />}
          label={sync.syncLabel}
          tone={syncTone}
          title="Sync status"
        />
      ) : null}
      {note?.pinned ? <MetaChip icon={<Pin size={11} />} label="Pinned" tone="amber" /> : null}
      {updatedLabel ? (
        <MetaChip icon={<CalendarClock size={11} />} label={updatedLabel} tone="emerald" title="Last updated" />
      ) : null}
      {note?.id ? (
        <CopyMetaChip
          icon={<Hash size={11} />}
          label={note.id}
          value={note.id}
          tone="indigo"
          title="Copy note ID"
          className="ml-0.5 max-w-[13rem] font-mono text-[9px] tracking-tight"
        />
      ) : null}
    </div>
  );
}

function MetaChip({
  icon,
  label,
  tone,
  title,
  className = "",
}: {
  icon: ReactNode;
  label: string;
  tone: MetaTone;
  title?: string;
  className?: string;
}) {
  const toneClass = {
    amber: "border-amber-400/30 bg-amber-500/12 text-amber-100 [&_svg]:text-amber-300",
    cyan: "border-cyan-400/30 bg-cyan-500/12 text-cyan-100 [&_svg]:text-cyan-300",
    emerald: "border-emerald-400/30 bg-emerald-500/12 text-emerald-100 [&_svg]:text-emerald-300",
    indigo: "border-indigo-400/30 bg-indigo-500/12 text-indigo-100 [&_svg]:text-indigo-300",
    muted: "border-white/10 bg-white/[.04] text-[var(--muted)] [&_svg]:text-[var(--muted)]",
    rose: "border-rose-400/30 bg-rose-500/12 text-rose-100 [&_svg]:text-rose-300",
    violet: "border-violet-400/30 bg-violet-500/12 text-violet-100 [&_svg]:text-violet-300",
  }[tone];

  return (
    <span
      className={`inline-flex max-w-[11rem] items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-4 ${toneClass} ${className}`}
      title={title}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function CopyMetaChip({
  icon,
  label,
  value,
  tone,
  title,
  className = "",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: MetaTone;
  title?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      title={title ?? "Copy note ID"}
      className={`group ${className}`}
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => setCopied(true));
      }}
    >
      <MetaChip
        icon={copied ? <Check size={11} /> : icon}
        label={label}
        tone={copied ? "emerald" : tone}
        className={className}
      />
    </button>
  );
}

function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
