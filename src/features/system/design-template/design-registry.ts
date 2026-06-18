export type DesignFeatureId = "sheet-workspace";

export type ActiveDesignFeature = {
  id: DesignFeatureId;
  title: string;
  subtitle: string;
  project: string;
};

const FEATURES: ActiveDesignFeature[] = [
  {
    id: "sheet-workspace",
    title: "Sheet Workspace",
    subtitle: "5 layout-direction variants",
    project: "P0020-Data-Box",
  },
];

export function listActiveDesignFeatures(): ActiveDesignFeature[] {
  return FEATURES;
}

export function getActiveDesignFeature(id: DesignFeatureId): ActiveDesignFeature | null {
  return FEATURES.find((f) => f.id === id) ?? null;
}

export const ACTIVE_DESIGN_COUNT = FEATURES.length;

/** Locked 2026-06 — Design F1 HubSingleFilterDropdown → settings-option-filter.tsx */
export const SETTINGS_OPTION_PICKER_DESIGN_LOCK = "F1" as const;

/** Locked 2026-06 — Design V4 Emoji TOC wide → noteHistoryTocRails.tsx */
export const NOTE_HISTORY_TOC_RAILS_DESIGN_LOCK = "V4" as const;
export const NOTE_HISTORY_COMPARE_DESIGN_LOCK = "V3" as const;
