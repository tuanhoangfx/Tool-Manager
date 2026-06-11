import type { ReactNode } from "react";
import type { ChartRow } from "../chart-items";
import type { PrefItem } from "../display-prefs/types";
import { chartPanelTitleFromDefs } from "../lib/chart-panel-titles";
import { MiniBarChart } from "./MiniBarChart";

export type DirectoryChartBandProps = {
  visCharts: Set<string>;
  defs: PrefItem[];
  data: Record<string, ChartRow[] | undefined>;
};

export function hasDirectoryCharts(
  visCharts: Set<string>,
  defs: PrefItem[],
  data: Record<string, ChartRow[] | undefined>,
): boolean {
  return defs.some((d) => visCharts.has(d.key) && data[d.key]);
}

/** Pass to `HubDirectoryScreen` `charts` only when ≥1 chart visible — avoids empty analytics frame. */
export function directoryChartBandNode(props: DirectoryChartBandProps): ReactNode | undefined {
  return hasDirectoryCharts(props.visCharts, props.defs, props.data) ? (
    <DirectoryChartBand {...props} />
  ) : undefined;
}

/** Golden directory charts row — defs order, Display prefs visibility, MiniBarChart + top-3/Others. */
export function DirectoryChartBand({ visCharts, defs, data }: DirectoryChartBandProps) {
  const keys = defs.map((d) => d.key).filter((k) => visCharts.has(k) && data[k]);
  if (keys.length === 0) return null;
  return (
    <>
      {keys.map((key) => (
        <MiniBarChart
          key={key}
          title={chartPanelTitleFromDefs(defs, key)}
          items={data[key]!}
        />
      ))}
    </>
  );
}
