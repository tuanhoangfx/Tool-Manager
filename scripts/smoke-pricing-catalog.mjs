#!/usr/bin/env node
/** Smoke: pricing catalog Supabase + RPC + optional P0016 API. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { INFI28_PRICING_CATALOG_ID } from "./lib/pricing-sheet-ingest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnv() {
  const env = { ...process.env };
  const p = path.resolve(root, "../../.env.shared");
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
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
const key = env.DATABOX_SUPABASE_SERVICE_ROLE || env.DATABOX_SUPABASE_ANON_KEY || "";
if (!url || !key) {
  console.error("FAIL: missing DATABOX_SUPABASE_* env");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const workerUrl = (env.VITE_CHATCENTER_WORKER_URL || "http://127.0.0.1:3921").replace(/\/$/, "");

async function main() {
  const { count, error: countErr } = await sb
    .from("product_pricing")
    .select("*", { count: "exact", head: true })
    .eq("catalog_id", INFI28_PRICING_CATALOG_ID);
  if (countErr) throw countErr;
  if (!count || count < 50) throw new Error(`Expected >=50 platforms, got ${count}`);

  const queries = ["báo giá Capcut", "Claude", "Cursor"];
  for (const q of queries) {
    const { data, error } = await sb.rpc("pricing_lookup", {
      p_catalog_id: INFI28_PRICING_CATALOG_ID,
      p_query: q,
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(`lookup failed for "${q}": ${JSON.stringify(data)}`);
    console.log("PASS rpc", q, "→", data.platform);
  }

  try {
    const res = await fetch(
      `${workerUrl}/api/pricing/${INFI28_PRICING_CATALOG_ID}/lookup?q=${encodeURIComponent("Capcut")}`,
    );
    const body = await res.json();
    if (!res.ok || !body.ok || !body.messages?.length) {
      throw new Error(`worker API: ${res.status} ${JSON.stringify(body)}`);
    }
    console.log("PASS worker API Capcut →", body.messages[0].slice(0, 60));
  } catch (e) {
    console.warn("WARN worker API (optional):", e.message);
  }

  console.log(JSON.stringify({ ok: true, platformCount: count }, null, 2));
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
