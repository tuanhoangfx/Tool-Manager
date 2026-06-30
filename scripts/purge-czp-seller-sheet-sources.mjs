#!/usr/bin/env node
/** Remove legacy CzP Seller Google Sheet mirrors from P0020 sheet_sources (cloud SSOT). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const ADMIN_EMAIL = process.argv.find((a, i) => process.argv[i - 1] === "--email") ?? "czpgo@outlook.com";

const CZP_SELLER_SHEET_ID = "10cTORpWxfp9PfuZ95gbpBhiurIM0yOose4oU5QSC-mY";
const PURGE_DEDUPE_KEYS = [
  `${CZP_SELLER_SHEET_ID}:404442643`,
  `${CZP_SELLER_SHEET_ID}:91093553`,
];

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

const { data: users, error: userErr } = await supabase.auth.admin.listUsers({ perPage: 200 });
if (userErr) throw userErr;
const user = (users?.users ?? []).find((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
if (!user?.id) {
  console.error(`User not found: ${ADMIN_EMAIL}`);
  process.exit(1);
}

const { data, error } = await supabase
  .from("sheet_sources")
  .delete()
  .eq("user_id", user.id)
  .in("dedupe_key", PURGE_DEDUPE_KEYS)
  .select("id, title, dedupe_key");
if (error) throw error;

console.log(
  JSON.stringify(
    {
      ok: true,
      userEmail: ADMIN_EMAIL,
      purged: data ?? [],
      hint: "Hard refresh Sheet tab (Ctrl+Shift+R) — boot sync will drop stale local uuid rows.",
    },
    null,
    2,
  ),
);
