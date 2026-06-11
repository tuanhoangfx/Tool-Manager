/** Golden analytics band titles — uppercase via `.hub-analytics-caption`. */
export const GOLDEN_CHART_PANEL_TITLES: Record<string, string> = {
  health_bar: "By Health",
  category_bar: "By Category",
  deploy_bar: "Deploy distribution",
  status_bar: "Status distribution",
  role_bar: "By Role",
  activity_bar: "By Activity",
  tool_bar: "Tool access",
  distribution_bar: "Activity distribution",
  kind_bar: "By kind",
  scope_bar: "By scope",
  apply_bar: "By apply mode",
  size_bar: "By size",
  mode_bar: "By mode",
  group_bar: "By group",
  template_bar: "By template",
  pages_bar: "By pages",
  seller_bar: "By seller",
  status_chart: "By status",
  pay_donut: "Pay distribution",
  revenue_chart: "Revenue",
  top_products: "Top products",
  cat_bar: "By category",
};

/** Strip Display Prefs suffix e.g. `By group (bar)` → `By group`. */
export function chartPanelTitleFromPrefLabel(label: string): string {
  return label.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

export function chartPanelTitleFromDefs<T extends string>(
  defs: readonly { key: T; label: string }[],
  key: T,
): string {
  const golden = GOLDEN_CHART_PANEL_TITLES[key];
  if (golden) return golden;
  const item = defs.find((d) => d.key === key);
  return item ? chartPanelTitleFromPrefLabel(item.label) : key;
}
