import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import type { SheetGridData } from "./sheet-grid-types";
import type { SheetSource } from "./sheet-sources";

export const PRICING_CATALOG_PREFIX = "pricing-catalog://";

export function isNonHttpSheetUrl(url: string | undefined): boolean {
  const u = String(url ?? "").trim();
  return Boolean(u) && !/^https?:\/\//i.test(u);
}

export function isPricingCatalogSource(
  source: Pick<SheetSource, "rawUrl" | "csvUrl" | "gid">,
): boolean {
  const raw = source.rawUrl?.trim() ?? "";
  const csv = source.csvUrl?.trim() ?? "";
  if (raw.startsWith(PRICING_CATALOG_PREFIX) || csv.startsWith(PRICING_CATALOG_PREFIX)) {
    return true;
  }
  const gid = source.gid?.trim() ?? "";
  const catalogGid = Boolean(gid && !/^\d+$/.test(gid));
  return catalogGid && (isNonHttpSheetUrl(raw) || isNonHttpSheetUrl(csv));
}

export function shouldLoadPricingCatalogGrid(
  source: Pick<SheetSource, "rawUrl" | "csvUrl" | "gid">,
): boolean {
  return isPricingCatalogSource(source);
}

export function pricingCatalogIdFromSource(source: Pick<SheetSource, "rawUrl" | "csvUrl" | "gid">): string {
  const raw = (source.rawUrl?.trim() || source.csvUrl?.trim() || "").replace(PRICING_CATALOG_PREFIX, "");
  return raw || source.gid?.trim() || "infi28-payment";
}

function bulletLines(bullets: unknown): string {
  if (!Array.isArray(bullets)) return "";
  return bullets.map((b) => String(b ?? "").trim()).filter(Boolean).join("\n");
}

function extraLines(extras: unknown): string {
  if (!Array.isArray(extras)) return "";
  return extras.map((e) => String(e ?? "").trim()).filter(Boolean).join("\n");
}

/** Load structured pricing rows from Supabase SSOT (not Google CSV). */
export async function fetchPricingCatalogGrid(catalogId: string): Promise<SheetGridData> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured — cannot load Pricing Catalog.");
  }
  const id = String(catalogId || "infi28-payment").trim();
  const { data, error } = await supabase
    .from("product_pricing")
    .select("platform_key, platform_label, header, bullets, extras, follow_up, sort_order, updated_at")
    .eq("catalog_id", id)
    .order("sort_order", { ascending: true });
  if (error) {
    throw new Error(`Pricing catalog "${id}": ${error.message}`);
  }
  if (!data?.length) {
    throw new Error(`Pricing catalog "${id}" is empty — run pricing:sync first.`);
  }
  const header = [
    "Platform",
    "Key",
    "Header",
    "Packages",
    "Warranty / Extras",
    "Follow-up",
    "Updated",
  ];
  const rows = (data ?? []).map((row) => [
    String(row.platform_label ?? ""),
    String(row.platform_key ?? ""),
    String(row.header ?? ""),
    bulletLines(row.bullets),
    extraLines(row.extras),
    String(row.follow_up ?? ""),
    row.updated_at ? String(row.updated_at).slice(0, 19).replace("T", " ") : "",
  ]);
  return { header, rows };
}

export function buildPricingCatalogSource(catalogId = "infi28-payment", title?: string): SheetSource {
  const url = `${PRICING_CATALOG_PREFIX}${catalogId}`;
  return {
    id: `pricing_${catalogId.replace(/[^a-z0-9-]+/gi, "_")}`,
    title: title ?? `💳 ${catalogId} Pricing (SSOT)`,
    rawUrl: url,
    csvUrl: url,
    gid: catalogId,
    createdAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    titleSource: "manual",
  };
}
