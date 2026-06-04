#!/usr/bin/env node
/**
 * Apply APPLY_FIX_V_NOTE_DROP.sql via Supabase Management API (E:\Dev\.env.shared token).
 * Usage: pnpm apply:fix-vnote:api [projectRef]
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { runMgmtDbQuery } from "../../scripts/lib/supabase-mgmt-query.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRef = process.argv[2] || "bklxcjrkhrevdcqjscku";
const sql = readFileSync(resolve(root, "supabase/APPLY_FIX_V_NOTE_DROP.sql"), "utf8");

console.log(`Applying APPLY_FIX_V_NOTE_DROP.sql to ${projectRef}…`);
await runMgmtDbQuery(projectRef, sql);
console.log("OK — vault RPC recreated (note_verify_sync_pass / note_vault_upsert)");
