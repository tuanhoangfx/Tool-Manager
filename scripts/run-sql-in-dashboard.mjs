/**
 * Prints SQL for dashboard paste (used with browser automation).
 * Usage: node scripts/run-sql-in-dashboard.mjs part1|part2|all
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const part = process.argv[2] ?? "part1";
const files = {
  part1: "supabase/APPLY_ALL_P0020_PART1.sql",
  part2: "supabase/APPLY_ALL_P0020_PART2.sql",
  all: "supabase/APPLY_ALL_P0020_COOKIE_BRIDGE.sql",
};
const path = resolve(root, files[part] ?? files.part1);
process.stdout.write(readFileSync(path, "utf8"));
