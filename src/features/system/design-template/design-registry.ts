export type DesignFeatureId = "notes-list-rail";

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
