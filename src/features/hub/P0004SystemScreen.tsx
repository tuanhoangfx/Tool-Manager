import type { ResolvedTool } from "../../types";
import { SystemTab } from "../system/SystemTab";
import { PageHeader } from "../design-preview/screens/PageHeader";

type Props = {
  tools: ResolvedTool[];
  loadingAll: boolean;
  lastRefreshedAt: number | null;
  onCopyPath: (path: string) => void;
};

export function P0004SystemScreen({ tools, loadingAll, lastRefreshedAt, onCopyPath }: Props) {
  return (
    <div className="anim-fade flex h-full min-h-0 flex-col">
      <PageHeader title="System" desc="P0004 — sync hub, drift, session log." />
      <div className="hub-p0004-embed custom-scrollbar min-h-0 flex-1 overflow-auto rounded-xl border border-white/10 bg-black/20 p-3">
        <SystemTab tools={tools} loadingAll={loadingAll} lastRefreshedAt={lastRefreshedAt} onCopyPath={onCopyPath} />
      </div>
    </div>
  );
}
