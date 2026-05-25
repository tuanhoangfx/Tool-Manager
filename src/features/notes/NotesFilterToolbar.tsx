import { StickyNote } from "lucide-react";
import { HubResultCount, HubTimeRangeSelect } from "../../components/sales-shell";
import type { FilterValues } from "../../components/sales-shell";
import { patchNotesListPrefs, type NotesListDensity } from "./notes-list-prefs";
import { NotesViewToggle } from "./NotesViewToggle";
import { readHubListPrefs } from "../../lib/url-prefs";

type Props = {
  shown: number;
  total: number;
  density: NotesListDensity;
  onDensityChange: (d: NotesListDensity) => void;
};

export function NotesFilterToolbar({ shown, total, density, onDensityChange }: Props) {
  const range = readHubListPrefs().range;

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
