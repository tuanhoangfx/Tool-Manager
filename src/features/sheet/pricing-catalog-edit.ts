import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import type { SheetGridData } from "./sheet-grid-types";
import { PRICING_CATALOG_PREFIX } from "./pricing-catalog-sheet";

export type PricingCatalogRow = {
  platformKey: string;
  platformLabel: string;
  header: string;
  packages: string;
  extras: string;
  followUp: string;
};

const GRID_HEADER = [
  "Platform",
  "Key",
  "Header",
  "Packages",
  "Warranty / Extras",
  "Follow-up",
  "Updated",
] as const;

function linesToBullets(text: string): string[] {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

function bulletsToLines(bullets: string[]): string {
  return bullets.map((b) => `• ${b}`).join("\n");
}

export function pricingRowFromGridRow(row: string[]): PricingCatalogRow {
  return {
    platformLabel: row[0] ?? "",
    platformKey: row[1] ?? "",
    header: row[2] ?? "",
    packages: row[3] ?? "",
    extras: row[4] ?? "",
    followUp: row[5] ?? "",
  };
}

export function gridRowFromPricingRow(row: PricingCatalogRow, updatedAt?: string): string[] {
  return [
    row.platformLabel,
    row.platformKey,
    row.header,
    row.packages,
    row.extras,
    row.followUp,
    updatedAt ? updatedAt.slice(0, 19).replace("T", " ") : "",
  ];
}

export function slugifyCatalogId(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function slugifyPlatformKey(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export async function ensurePricingCatalogExists(catalogId: string, label: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
  const id = slugifyCatalogId(catalogId);
  if (!id) throw new Error("Catalog id is required.");
  const { error } = await supabase.from("pricing_catalogs").upsert(
    {
      id,
      label: label.trim() || id,
      bot_ids: id === "infi28-payment" ? ["infi28"] : [],
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function upsertPricingCatalogRow(
  catalogId: string,
  row: PricingCatalogRow,
  sortOrder = 0,
): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
  const id = slugifyCatalogId(catalogId);
  const platformKey = slugifyPlatformKey(row.platformKey || row.platformLabel);
  if (!platformKey) throw new Error("Platform key is required.");
  const { error } = await supabase.from("product_pricing").upsert(
    {
      catalog_id: id,
      platform_key: platformKey,
      platform_label: row.platformLabel.trim() || platformKey,
      header: row.header.trim() || row.platformLabel.trim() || platformKey,
      bullets: linesToBullets(row.packages),
      extras: linesToBullets(row.extras),
      follow_up: row.followUp.trim() || null,
      sort_order: sortOrder,
    },
    { onConflict: "catalog_id,platform_key" },
  );
  if (error) throw error;
}

export async function deletePricingCatalogRow(catalogId: string, platformKey: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
  const { error } = await supabase
    .from("product_pricing")
    .delete()
    .eq("catalog_id", slugifyCatalogId(catalogId))
    .eq("platform_key", slugifyPlatformKey(platformKey));
  if (error) throw error;
}

export function patchGridRow(
  grid: SheetGridData,
  rowIndex: number,
  row: PricingCatalogRow,
): SheetGridData {
  const next = grid.rows.map((r) => [...r]);
  const prev = next[rowIndex] ?? [];
  next[rowIndex] = gridRowFromPricingRow(row, new Date().toISOString());
  if (GRID_HEADER.length > next[rowIndex].length) {
    next[rowIndex] = [...next[rowIndex], ...prev.slice(next[rowIndex].length)];
  }
  return { header: [...grid.header], rows: next };
}

export function appendGridRow(grid: SheetGridData, row: PricingCatalogRow): SheetGridData {
  return {
    header: [...grid.header],
    rows: [...grid.rows, gridRowFromPricingRow(row, new Date().toISOString())],
  };
}

export function catalogUrlFromId(catalogId: string): string {
  return `${PRICING_CATALOG_PREFIX}${slugifyCatalogId(catalogId)}`;
}

export { bulletsToLines, linesToBullets };
