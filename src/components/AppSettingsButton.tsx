import { Settings } from "lucide-react";

type Props = {
  active?: boolean;
  onClick: () => void;
  title?: string;
  /** Tab header row (34px, label hidden on narrow viewports). */
  header?: boolean;
};

/** Generic settings page trigger (not Cookie tab header — use CookieHeaderSettingsButton there). */
export function AppSettingsButton({
  active = false,
  onClick,
  title = "Settings",
  header = false,
}: Props) {
  return (
    <button
      type="button"
      className={`btn-ghost btn text-[12px] ${header ? "h-[var(--hub-control-h)] shrink-0" : ""} ${
        active ? "ring-1 ring-indigo-400/50 bg-indigo-500/10" : ""
      }`}
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
    >
      <Settings size={14} className={active ? "text-indigo-200" : undefined} />
      <span className={header ? "hidden sm:inline" : undefined}>Settings</span>
    </button>
  );
}
