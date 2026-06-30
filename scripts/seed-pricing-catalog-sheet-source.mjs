#!/usr/bin/env node
/** Seed native pricing-catalog sheet into Data Box sheet_sources (Supabase SSOT, not Google import). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const CATALOG_ID = process.argv.find((a, i) => process.argv[i - 1] === "--catalog") ?? "infi28-payment";
const ADMIN_EMAIL = process.argv.find((a, i) => process.argv[i - 1] === "--email") ?? "czpgo@outlook.com";
const PRICING_CATALOG_PREFIX = "pricing-catalog://";

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
const key = env.DATABOX_SUPABASE_SERVICE_ROLE || "";
if (!url || !key) {
  console.error("Missing DATABOX_SUPABASE_URL / DATABOX_SUPABASE_SERVICE_ROLE");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const catalogUrl = `${PRICING_CATALOG_PREFIX}${CATALOG_ID}`;
const dedupeKey = `pricing-catalog:${CATALOG_ID}`;

const { data: users, error: userErr } = await supabase.auth.admin.listUsers({ perPage: 200 });
if (userErr) throw userErr;
const user = (users?.users ?? []).find((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
if (!user?.id) {
  console.error(`Admin user not found: ${ADMIN_EMAIL}`);
  process.exit(1);
}

const row = {
  user_id: user.id,
  title: "💳 Infi28 Pricing (SSOT)",
  raw_url: catalogUrl,
  csv_url: catalogUrl,
  gid: CATALOG_ID,
  dedupe_key: dedupeKey,
  title_source: "manual",
  last_synced_at: new Date().toISOString(),
};

const { data, error } = await supabase
  .from("sheet_sources")
  .upsert(row, { onConflict: "user_id,dedupe_key" })
  .select("id, title, dedupe_key, raw_url")
  .single();
if (error) throw error;

console.log(JSON.stringify({ ok: true, sheetSource: data, userEmail: ADMIN_EMAIL, catalogId: CATALOG_ID }, null, 2));
