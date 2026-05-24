#!/usr/bin/env node
/** Print first note id from Supabase (for P0020_PROBE_NOTE_ID). Requires .env.local JWT or open RLS. */
import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");
const env = {};
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}

if (env.P0020_PROBE_NOTE_ID?.trim()) {
  console.log(env.P0020_PROBE_NOTE_ID.trim());
  process.exit(0);
}

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
const res = await fetch(`${url}/rest/v1/notes?select=id&limit=1`, {
  headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
});
const body = await res.text();
if (!res.ok) {
  console.error("Cannot list notes (RLS?). Set P0020_PROBE_NOTE_ID manually in .env.local");
  console.error(res.status, body.slice(0, 120));
  process.exit(1);
}
const rows = JSON.parse(body);
const id = rows[0]?.id;
if (!id) {
  console.error("No notes in project — create a note in Tool first");
  process.exit(1);
}
console.log(id);
if (process.argv.includes("--write-env")) {
  appendFileSync(envPath, `\nP0020_PROBE_NOTE_ID=${id}\n`);
  console.error(`Appended P0020_PROBE_NOTE_ID to .env.local`);
}
