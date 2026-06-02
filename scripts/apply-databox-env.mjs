/**
 * Write Data Box Supabase URL + anon key to .env.local (from env or args).
 * Usage:
 *   set DATABOX_ANON_KEY=eyJ... && node scripts/apply-databox-env.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");
const ref = process.env.DATABOX_REF || "bklxcjrkhrevdcqjscku";
const url = `https://${ref}.supabase.co`;
const anon = process.env.DATABOX_ANON_KEY || process.argv[2];
if (!anon?.startsWith("eyJ")) {
  console.error("Set DATABOX_ANON_KEY or pass anon as argv[2]");
  process.exit(1);
}

let body = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const upsert = (key, val) => {
  const line = `${key}=${val}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  body = re.test(body) ? body.replace(re, line) : `${body.trimEnd()}\n${line}`;
};
upsert("VITE_SUPABASE_URL", url);
upsert("VITE_SUPABASE_ANON_KEY", anon);
writeFileSync(envPath, `${body.trimEnd()}\n`, "utf8");
console.log("Updated", envPath, url);
