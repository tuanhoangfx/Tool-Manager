#!/usr/bin/env node
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { runMgmtDbQuery } from "../../scripts/lib/supabase-mgmt-query.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRef = process.argv[2] || "bklxcjrkhrevdcqjscku";
const sql = readFileSync(
  resolve(root, "supabase/migrations/20260606180000_note_version_delete.sql"),
  "utf8",
);

console.log(`Applying note_version_delete RPC to ${projectRef}…`);
await runMgmtDbQuery(projectRef, sql);
console.log("OK — note_version_delete");
