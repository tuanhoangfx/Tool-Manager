import type { ResolvedTool } from "../../types";
import { ActivityTab } from "../activity/ActivityTab";
import { PageHeader } from "../design-preview/screens/PageHeader";

export function P0004ActivityScreen({ tools }: { tools: ResolvedTool[] }) {
  return (
    <div className="anim-fade flex h-full min-h-0 flex-col">
      <PageHeader title="Activity" desc="P0004 — timeline commit cross-repo." />
      <div className="hub-p0004-embed custom-scrollbar min-h-0 flex-1 overflow-auto rounded-xl border border-white/10 bg-black/20 p-3">
        <ActivityTab tools={tools} />
      </div>
    </div>
  );
}
