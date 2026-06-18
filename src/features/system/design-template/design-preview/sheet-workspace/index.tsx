import { useState, type ComponentType } from "react";
import { DesignSection } from "../../../../../theme/p0008";
import { VARIANTS, type VariantToken } from "./tokens";
import { V1TriPaneGrid } from "./V1-TriPaneGrid";
import { V2SourceCardsInspector } from "./V2-SourceCardsInspector";
import { V3IconRailConsole } from "./V3-IconRailConsole";
import { V4SearchColumnDrawer } from "./V4-SearchColumnDrawer";
import { V5GalleryTimeline } from "./V5-GalleryTimeline";
import "./sheet-workspace-preview.css";

const RENDER: Record<VariantToken["id"], ComponentType> = {
  V1: V1TriPaneGrid,
  V2: V2SourceCardsInspector,
  V3: V3IconRailConsole,
  V4: V4SearchColumnDrawer,
  V5: V5GalleryTimeline,
};

/** Orchestrator — Sheet Workspace design review. 5 layout-direction variants, shared MOCK. */
export function SheetWorkspacePreview() {
  const [filter, setFilter] = useState<"ALL" | VariantToken["id"]>("ALL");
  const shown = filter === "ALL" ? VARIANTS : VARIANTS.filter((v) => v.id === filter);

  return (
    <div className="space-y-4">
      <div className="swpv swpv-picker">
        <button type="button" className={filter === "ALL" ? "is-active" : ""} onClick={() => setFilter("ALL")}>
          Tất cả
        </button>
        {VARIANTS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={filter === v.id ? "is-active" : ""}
            onClick={() => setFilter(v.id)}
          >
            {v.id}
          </button>
        ))}
      </div>

      {shown.map((v) => {
        const Body = RENDER[v.id];
        return (
          <DesignSection key={v.id} num={v.num} title={v.title} lang={v.lang}>
            <Body />
          </DesignSection>
        );
      })}
    </div>
  );
}
