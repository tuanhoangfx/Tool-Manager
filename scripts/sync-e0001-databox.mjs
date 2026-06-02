/**
 * Copy Data Box URL + anon key from P0020 .env.local into E0001 supabase-config.js.
 * Usage: pnpm sync:e0001-databox
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { loadP0020Env } from "./load-p0020-env.mjs";

const { root, env } = loadP0020Env();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Need VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in P0020 .env.local");
  process.exit(1);
}

const extPath = resolve(root, "../../Extension/E0001-cookie-bridge/supabase-config.js");
if (!existsSync(extPath)) {
  console.error("Extension not found:", extPath);
  process.exit(1);
}

let body = readFileSync(extPath, "utf8");
body = body.replace(
  /export const E0001_DATA_SUPABASE_URL = "[^"]*";/,
  `export const E0001_DATA_SUPABASE_URL = "${url}";`,
);
body = body.replace(
  /export const E0001_DATA_SUPABASE_ANON_KEY =\s*\n?\s*"[^"]*";/,
  `export const E0001_DATA_SUPABASE_ANON_KEY =\n  "${key}";`,
);

writeFileSync(extPath, body, "utf8");
console.log("Updated E0001 Data Box config:", extPath);
