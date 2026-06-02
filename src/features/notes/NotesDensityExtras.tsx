import { AlignJustify, List } from "lucide-react";
import { Section, SectionIcon } from "@tool-workspace/hub-ui";
import { patchNotesListPrefs, type NotesListDensity } from "./notes-list-prefs";

type Props = {
  density: NotesListDensity;
  onDensityChange?: (d: NotesListDensity) => void;
};

export function NotesDensityExtras({ density, onDensityChange }: Props) {
  const pick = (next: NotesListDensity) => {
    patchNotesListPrefs({ ndens: next === "comfort" ? null : next });
    onDensityChange?.(next);
  };

  return (
    <Section icon={<SectionIcon icon={List} className="text-violet-300" />} label="List layout">
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => pick("comfort")}
          className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
            density === "comfort"
              ? "bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/40"
              : "bg-white/[.03] text-[var(--muted)] hover:bg-white/[.06] hover:text-[var(--text)]"
          }`}
        >
          <List size={12} />
          Comfort
        </button>
        <button
          type="button"
          onClick={() => pick("compact")}
          className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
            density === "compact"
              ? "bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/40"
              : "bg-white/[.03] text-[var(--muted)] hover:bg-white/[.06] hover:text-[var(--text)]"
          }`}
        >
          <AlignJustify size={12} />
          Compact
        </button>
      </div>
    </Section>
  );
}
