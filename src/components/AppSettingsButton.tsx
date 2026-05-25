import { Settings } from "lucide-react";

type Props = {
  active?: boolean;
  onClick: () => void;
  title?: string;
};

export function AppSettingsButton({ active = false, onClick, title = "Settings" }: Props) {
  return (
    <button
      type="button"
      className={`btn-ghost btn text-[12px] ${active ? "ring-1 ring-indigo-400/50" : ""}`}
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
    >
      <Settings size={14} />
      Settings
    </button>
  );
}
