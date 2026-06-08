#!/usr/bin/env node
/** Apply hub_corpus_ingest migration to P0020 Supabase. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runMgmtDbQuery } from "../../scripts/lib/supabase-mgmt-query.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRef = process.argv[2] || "bklxcjrkhrevdcqjscku";
const sql = fs.readFileSync(
  path.join(__dirname, "../supabase/migrations/20260607120000_hub_corpus_ingest.sql"),
  "utf8",
);

console.log(`Applying hub_corpus_ingest to ${projectRef}…`);
await runMgmtDbQuery(projectRef, sql);
console.log("OK");
