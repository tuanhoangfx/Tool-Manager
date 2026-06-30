#!/usr/bin/env node
/**
 * Sync Infi Docs pricing → P0020 Supabase product_pricing + local JSON cache for P0016.
 *
 *   node scripts/sync-infi28-pricing-catalog.mjs
 *   node scripts/sync-infi28-pricing-catalog.mjs --write-p0016-cache
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  INFI28_FAQ_GID,
  INFI28_PRICING_CATALOG_ID,
  INFI28_SHEET_ID,
  cardsObjectToRows,
  extractPricingCardsFromCsv,
  fetchInfiDocsFaqCsv,
} from "./lib/pricing-sheet-ingest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const writeP0016 = process.argv.includes("--write-p0016-cache");

function loadEnv() {
  const envPath = path.resolve(root, "../../.env.shared");
  const env = { ...process.env };
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq > 0) env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
    }
  }
  return env;
}

const env = loadEnv();
const url = (env.DATABOX_SUPABASE_URL || "").replace(/\/$/, "");
const key = env.DATABOX_SUPABASE_SERVICE_ROLE || env.DATABOX_SUPABASE_SECRET_KEY || "";
if (!url || !key) {
  console.error("Missing DATABOX_SUPABASE_URL / DATABOX_SUPABASE_SERVICE_ROLE in .env.shared");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  console.log("==> Fetch Infi Docs FAQ sheet…");
  const csv = await fetchInfiDocsFaqCsv();
  const cards = extractPricingCardsFromCsv(csv);
  const platformCount = Object.keys(cards).length;
  if (!platformCount) throw new Error("No pricing cards parsed from sheet");

  console.log(`==> Parsed ${platformCount} platforms`);

  const rows = cardsObjectToRows(INFI28_PRICING_CATALOG_ID, cards);
  const now = new Date().toISOString();

  const { error: catErr } = await supabase.from("pricing_catalogs").upsert({
    id: INFI28_PRICING_CATALOG_ID,
    label: "Infi 28 Cổng thanh toán (Czp Docs)",
    sheet_id: INFI28_SHEET_ID,
    sheet_gid: INFI28_FAQ_GID,
    sheet_url: `https://docs.google.com/spreadsheets/d/${INFI28_SHEET_ID}/edit?gid=${INFI28_FAQ_GID}`,
    bot_ids: ["infi28"],
    last_synced_at: now,
    updated_at: now,
  });
  if (catErr) throw catErr;

  const { error: delErr } = await supabase
    .from("product_pricing")
    .delete()
    .eq("catalog_id", INFI28_PRICING_CATALOG_ID);
  if (delErr) throw delErr;

  const chunkSize = 50;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize).map((r) => ({ ...r, updated_at: now }));
    const { error } = await supabase.from("product_pricing").insert(chunk);
    if (error) throw error;
  }

  const { data: lookup, error: rpcErr } = await supabase.rpc("pricing_lookup", {
    p_catalog_id: INFI28_PRICING_CATALOG_ID,
    p_query: "báo giá Capcut",
  });
  if (rpcErr) throw rpcErr;
  if (!lookup?.ok) throw new Error(`pricing_lookup smoke failed: ${JSON.stringify(lookup)}`);

  if (writeP0016) {
    const p0016Cards = path.resolve(root, "../P0016-ChatCenter/data/corpus/infi28-payment-cards.json");
    fs.mkdirSync(path.dirname(p0016Cards), { recursive: true });
    const slim = {};
    for (const [k, v] of Object.entries(cards)) {
      slim[k] = {
        platform: v.platform,
        header: v.header,
        bullets: v.bullets,
        extras: v.extras,
        followUp: v.followUp,
      };
    }
    fs.writeFileSync(p0016Cards, `${JSON.stringify(slim, null, 2)}\n`, "utf8");
    console.log("==> Wrote P0016 cache:", p0016Cards);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        catalogId: INFI28_PRICING_CATALOG_ID,
        platforms: platformCount,
        lookupSample: {
          platform: lookup.platform,
          bulletCount: Array.isArray(lookup.bullets) ? lookup.bullets.length : 0,
        },
        syncedAt: now,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
