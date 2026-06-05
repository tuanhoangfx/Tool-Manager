import { StickyNote } from "lucide-react";
import { HubResultCount, HubTimeRangeSelect } from "../../components/sales-shell";
import type { FilterValues } from "../../components/sales-shell";
import type { TimeRange } from "../../lib/url-prefs";

type Props = {
  range: TimeRange;
  shown: number;
  total: number;
};

export function NotesFilterToolbar({ range, shown, total }: Props) {
  return (
    <>
      <HubTimeRangeSelect value={range} />
      <HubResultCount icon={StickyNote} shown={shown} total={total} />
    </>
  );
}

export type { FilterValues };
