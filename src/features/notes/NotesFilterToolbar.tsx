import { StickyNote } from "lucide-react";
import { HubResultCount, HubWorkspacePeriodSelect } from "../../components/sales-shell";
import type { FilterValues } from "../../components/sales-shell";

type Props = {
  shown: number;
  total: number;
};

export function NotesFilterToolbar({ shown, total }: Props) {
  return (
    <>
      <HubWorkspacePeriodSelect scope="notes" defaultRange="all" inactiveKeys={["all"]} />
      <HubResultCount icon={StickyNote} shown={shown} total={total} />
    </>
  );
}

export type { FilterValues };
