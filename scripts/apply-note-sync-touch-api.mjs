#!/usr/bin/env node
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { runMgmtDbQuery } from "../../scripts/lib/supabase-mgmt-query.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRef = process.argv[2] || "bklxcjrkhrevdcqjscku";
const sql = readFileSync(resolve(root, "supabase/APPLY_NOTE_SYNC_TOUCH_FLAG.sql"), "utf8");

console.log(`Applying note sync touch flag to ${projectRef}…`);
await runMgmtDbQuery(projectRef, sql);
console.log("OK — synced_at only bumps when p_touch_synced_at=true");
