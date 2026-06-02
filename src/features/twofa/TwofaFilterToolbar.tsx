import { Shield } from "lucide-react";
import { HubResultCount, HubTimeRangeSelect } from "../../components/sales-shell";
import type { TimeRange } from "../../lib/url-prefs";

type Props = {
  range: TimeRange;
  shown: number;
  total: number;
};

export function TwofaFilterToolbar({ range, shown, total }: Props) {
  return (
    <>
      <HubTimeRangeSelect value={range} />
      <HubResultCount icon={Shield} shown={shown} total={total} />
    </>
  );
}
