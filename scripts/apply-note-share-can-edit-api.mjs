#!/usr/bin/env node
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { runMgmtDbQuery } from "../../scripts/lib/supabase-mgmt-query.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRef = process.argv[2] || "bklxcjrkhrevdcqjscku";
const sql = readFileSync(
  resolve(root, "supabase/migrations/20260605120000_note_share_can_edit.sql"),
  "utf8",
);

console.log(`Applying note share_can_edit + public share save to ${projectRef}…`);
await runMgmtDbQuery(projectRef, sql);
console.log("OK — share_can_edit, note_public_share_get/save updated");
