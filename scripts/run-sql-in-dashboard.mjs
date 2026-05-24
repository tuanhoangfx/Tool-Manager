#!/usr/bin/env node
/** Print paths for manual SQL Editor apply (generated APPLY_ALL is the one-shot file). */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  migrations: "supabase/migrations/",
  generated: "supabase/APPLY_ALL_P0020_COOKIE_BRIDGE.sql",
  doc: "docs/SUPABASE-P0020.md",
};

console.log("P0020 Supabase — source of truth: migrations/\n");
console.log("Regenerate dashboard bundle:");
console.log("  pnpm generate:apply-all\n");
console.log("Paste in SQL Editor:");
console.log(`  ${resolve(root, files.generated)}\n`);
console.log(`See ${files.doc}`);
