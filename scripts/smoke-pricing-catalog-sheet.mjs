#!/usr/bin/env node
/** Smoke: pricing catalog sheet source + product_pricing rows (SSOT). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnv() {
  const env = { ...process.env };
  for (const p of [
    path.resolve(root, "../../.env.shared"),
    path.resolve(root, ".env.local"),
  ]) {
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq > 0) env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
    }
    break;
  }
  return env;
}

const env = loadEnv();
const url = (env.DATABOX_SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const anonKey = env.DATABOX_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";
const serviceKey = env.DATABOX_SUPABASE_SERVICE_ROLE || "";
if (!url || !anonKey) {
  console.error("Missing Supabase URL/anon key");
  process.exit(1);
}

const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const catalogId = "infi28-payment";

const { data: rows, error: rowErr } = await anon
  .from("product_pricing")
  .select("platform_key")
  .eq("catalog_id", catalogId);
if (rowErr) throw rowErr;
if (!rows?.length) {
  console.error(`FAIL: product_pricing empty for ${catalogId}`);
  process.exit(1);
}

const sbAdmin = serviceKey
  ? createClient(url, serviceKey, { auth: { persistSession: false } })
  : anon;
const { data: sources, error: srcErr } = await sbAdmin
  .from("sheet_sources")
  .select("title, raw_url, dedupe_key")
  .eq("dedupe_key", `pricing-catalog:${catalogId}`);
if (srcErr) throw srcErr;
if (!sources?.length) {
  console.error("FAIL: sheet_sources missing pricing-catalog SSOT row");
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      catalogId,
      productRows: rows.length,
      sheetSource: sources[0],
    },
    null,
    2,
  ),
);
