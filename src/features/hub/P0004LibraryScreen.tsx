import { useMemo, useState } from "react";
import { ToolFilterBar } from "../../components";
import { StoreTab } from "../store/StoreTab";
import type { ResolvedTool } from "../../types";
import { PageHeader } from "../design-preview/screens/PageHeader";
import "../../styles/hub-library.css";

type Props = {
  tools: ResolvedTool[];
  loadingAll: boolean;
  onRefresh: () => void;
};

export function P0004LibraryScreen({ tools, loadingAll, onRefresh }: Props) {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedId, setSelectedId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools.filter((tool) => {
      const okStatus = statusFilter === "All" || tool.healthLabel === statusFilter || tool.status === statusFilter;
      const okQ =
        !q ||
        [tool.name, tool.code, tool.repo, tool.summary].join(" ").toLowerCase().includes(q);
      return okStatus && okQ;
    });
  }, [tools, query, statusFilter]);

  return (
    <div className="hub-library-scope anim-fade flex h-full min-h-0 flex-col">
      <PageHeader
        title="Tool Library"
        desc="P0004 GitHub Tool Manager — theme P0008."
        actions={
          <button type="button" className="btn text-[12px]" onClick={onRefresh} disabled={loadingAll}>
            {loadingAll ? "Refreshing…" : "Refresh GitHub"}
          </button>
        }
      />
      <ToolFilterBar
        variant="tools"
        query={query}
        shown={filtered.length}
        total={tools.length}
        onQueryChange={setQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      <div className="hub-p0004-embed custom-scrollbar min-h-0 flex-1 overflow-auto rounded-xl border border-white/10 bg-[var(--panel-2)] p-3">
        <StoreTab
          tools={filtered}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setModalOpen(true);
          }}
          viewMode={viewMode}
          modalOpen={modalOpen}
          onCloseModal={() => setModalOpen(false)}
        />
      </div>
    </div>
  );
}
