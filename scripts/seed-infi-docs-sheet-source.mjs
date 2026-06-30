#!/usr/bin/env node
/** Seed Infi Docs sheet into Data Box sheet_sources (cloud) for admin UI. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { INFI28_FAQ_GID, INFI28_SHEET_ID } from "./lib/pricing-sheet-ingest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const ADMIN_EMAIL = process.argv.find((a, i) => process.argv[i - 1] === "--email") ?? "czpgo@outlook.com";

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
const rawUrl = `https://docs.google.com/spreadsheets/d/${INFI28_SHEET_ID}/edit?gid=${INFI28_FAQ_GID}`;
const csvUrl = `https://docs.google.com/spreadsheets/d/${INFI28_SHEET_ID}/export?format=csv&gid=${INFI28_FAQ_GID}`;
const dedupeKey = `${INFI28_SHEET_ID}:${INFI28_FAQ_GID}`;

const { data: users, error: userErr } = await supabase.auth.admin.listUsers({ perPage: 200 });
if (userErr) throw userErr;
const user = (users?.users ?? []).find((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
if (!user?.id) {
  console.error(`Admin user not found: ${ADMIN_EMAIL}`);
  process.exit(1);
}

const row = {
  user_id: user.id,
  title: "Infi Docs — Pricing & FAQ",
  raw_url: rawUrl,
  csv_url: csvUrl,
  gid: INFI28_FAQ_GID,
  dedupe_key: dedupeKey,
  title_source: "manual",
  last_synced_at: new Date().toISOString(),
};

const { data, error } = await supabase
  .from("sheet_sources")
  .upsert(row, { onConflict: "user_id,dedupe_key" })
  .select("id, title, dedupe_key")
  .single();
if (error) throw error;

console.log(JSON.stringify({ ok: true, sheetSource: data, userEmail: ADMIN_EMAIL }, null, 2));
