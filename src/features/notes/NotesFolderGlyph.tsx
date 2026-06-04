import { FolderOpen } from "lucide-react";

type Props = {
  color: string;
  size?: number;
  /** Compact icon only (dropdown rows). */
  variant?: "icon" | "badge";
  className?: string;
};

/** Shared folder color + icon — FilterBar, note folder picker, list rail. */
export function NotesFolderGlyph({ color, size = 12, variant = "badge", className = "" }: Props) {
  if (variant === "icon") {
    return <FolderOpen size={size} className={`shrink-0 ${className}`} style={{ color }} aria-hidden />;
  }
  const box = size <= 12 ? "h-[22px] w-[22px] rounded-[7px]" : "h-6 w-6 rounded-lg";
  const iconSize = size <= 12 ? 11 : 12;
  return (
    <span
      className={`inline-grid shrink-0 place-items-center border ${box} ${className}`}
      style={{
        borderColor: `${color}66`,
        background: `${color}28`,
        color,
      }}
      aria-hidden
    >
      <FolderOpen size={iconSize} strokeWidth={2.25} />
    </span>
  );
}

export function NotesFolderListDot({ color, title }: { color: string; title?: string }) {
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white/15"
      style={{ background: color }}
      title={title}
      aria-hidden
    />
  );
}
