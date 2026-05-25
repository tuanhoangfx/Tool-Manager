import { AlignJustify, List } from "lucide-react";
import type { NotesListDensity } from "./notes-list-prefs";

export function NotesViewToggle({
  value,
  onChange,
}: {
  value: NotesListDensity;
  onChange: (v: NotesListDensity) => void;
}) {
  return (
    <div className="inline-flex h-[34px] items-center rounded-lg border border-white/10 bg-[var(--panel)] p-0.5">
      <Btn
        active={value === "comfort"}
        onClick={() => onChange("comfort")}
        icon={<List size={14} />}
        label="Comfort"
      />
      <Btn
        active={value === "compact"}
        onClick={() => onChange("compact")}
        icon={<AlignJustify size={14} />}
        label="Compact"
      />
    </div>
  );
}

function Btn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-full items-center gap-1.5 rounded-md px-2.5 text-xs transition-colors ${
        active ? "bg-indigo-500/20 text-indigo-200" : "text-[var(--muted)] hover:text-[var(--text)]"
      }`}
    >
      {icon} {label}
    </button>
  );
}
