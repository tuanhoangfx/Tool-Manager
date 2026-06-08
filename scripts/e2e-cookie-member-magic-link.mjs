#!/usr/bin/env node
/** Print magic-link URL for browser E2E (CS00761 → Cookie Auto). */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const p of [resolve(root, "../../.env.shared"), resolve(root, ".env.local")]) {
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq > 0 && !process.env[t.slice(0, eq).trim()]) process.env[t.slice(0, eq).trim()] = t.slice(eq + 1);
  }
}

const loginId = (process.argv[2] || "cs00761").toLowerCase();
const redirect = process.argv[3] || "http://127.0.0.1:5177/cookie";
const email = `${loginId}@infix1.io.vn`;
const url = process.env.DATABOX_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const sr = process.env.DATABOX_SUPABASE_SERVICE_ROLE;
if (!url || !sr) {
  console.error("Missing DATABOX_SUPABASE_URL / SERVICE_ROLE");
  process.exit(1);
}

const admin = createClient(url, sr, { auth: { autoRefreshToken: false, persistSession: false } });
const { data, error } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email,
  options: { redirectTo: redirect },
});
if (error || !data?.properties?.action_link) {
  console.error(error?.message ?? "no action_link");
  process.exit(1);
}
console.log(data.properties.action_link);
