#!/usr/bin/env node
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { runMgmtDbQuery } from "../../scripts/lib/supabase-mgmt-query.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRef = process.argv[2] || "bklxcjrkhrevdcqjscku";
const sql = readFileSync(
  resolve(root, "supabase/migrations/20260606190000_note_versions_list_body_md.sql"),
  "utf8",
);

console.log(`Applying note_versions_list body_md to ${projectRef}…`);
await runMgmtDbQuery(projectRef, sql);
console.log("OK — note_versions_list returns body_md (+ body_truncated)");
