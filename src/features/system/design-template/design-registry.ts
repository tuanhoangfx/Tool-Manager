export type DesignFeatureId = "note-history-toc-rails";

export type ActiveDesignFeature = {
  id: DesignFeatureId;
  title: string;
  subtitle: string;
};

const FEATURES: ActiveDesignFeature[] = [];

export function listActiveDesignFeatures(): ActiveDesignFeature[] {
  return FEATURES;
}

export const ACTIVE_DESIGN_COUNT = FEATURES.length;

export function getDesignFeature(id: DesignFeatureId): ActiveDesignFeature | undefined {
  return FEATURES.find((f) => f.id === id);
}

/** Locked 2026-06 — Design V4 Emoji TOC wide → noteHistoryTocRails.tsx */
export const NOTE_HISTORY_TOC_RAILS_DESIGN_LOCK = "V4" as const;
export const NOTE_HISTORY_COMPARE_DESIGN_LOCK = "V3" as const;

/** Locked 2026-06 — Design F1 HubSingleFilterDropdown → settings-option-filter.tsx */
export const SETTINGS_OPTION_PICKER_DESIGN_LOCK = "F1" as const;
