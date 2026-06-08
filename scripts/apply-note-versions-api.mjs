#!/usr/bin/env node
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { runMgmtDbQuery } from "../../scripts/lib/supabase-mgmt-query.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRef = process.argv[2] || "bklxcjrkhrevdcqjscku";
const sql = readFileSync(
  resolve(root, "supabase/migrations/20260606120000_note_versions.sql"),
  "utf8",
);

console.log(`Applying note_versions + RPCs to ${projectRef}…`);
await runMgmtDbQuery(projectRef, sql);
console.log("OK — note_versions, note_create_version_if_changed, list/get/restore");
