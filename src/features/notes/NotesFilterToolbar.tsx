import { StickyNote } from "lucide-react";
import { HubResultCount, HubTimeRangeSelect } from "../../components/sales-shell";
import type { FilterValues } from "../../components/sales-shell";
import type { TimeRange } from "../../lib/url-prefs";
import { patchNotesListPrefs, type NotesListDensity } from "./notes-list-prefs";
import { NotesViewToggle } from "./NotesViewToggle";

type Props = {
  range: TimeRange;
  shown: number;
  total: number;
  density: NotesListDensity;
  onDensityChange: (d: NotesListDensity) => void;
};

export function NotesFilterToolbar({ range, shown, total, density, onDensityChange }: Props) {
  return (
    <>
      <HubTimeRangeSelect value={range} />
      <NotesViewToggle
        value={density}
        onChange={(d) => {
          onDensityChange(d);
          patchNotesListPrefs({ ndens: d === "comfort" ? null : d });
        }}
      />
      <HubResultCount icon={StickyNote} shown={shown} total={total} />
    </>
  );
}

export type { FilterValues };
