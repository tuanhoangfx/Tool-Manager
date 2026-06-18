#!/usr/bin/env node
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { runMgmtDbQuery } from "../../scripts/lib/supabase-mgmt-query.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRef = process.argv[2] || "bklxcjrkhrevdcqjscku";
const sql = readFileSync(
  resolve(root, "supabase/migrations/20260617143000_note_cookie_member_counts_batch.sql"),
  "utf8",
);

console.log(`Applying note cookie member counts batch RPC to ${projectRef}…`);
await runMgmtDbQuery(projectRef, sql);
console.log("OK — note_cookie_member_counts_batch is ready.");

