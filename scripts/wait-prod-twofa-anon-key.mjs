#!/usr/bin/env node
/** Wait until production bundle embeds non-empty VITE_TWOFA_SUPABASE_ANON_KEY. */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { hasTwofaAnonInBundle } from "./twofa-bundle-env-check.mjs";

const require = createRequire(import.meta.url);
const { readJson } = require("../../scripts/lib/version-sync-lib.cjs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function parseOrigin(argv) {
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) return argv[++i].replace(/\/$/, "");
  }
  const manifest = readJson(path.join(root, "tool.manifest.json")) || {};
  return (
    process.env.P0020_PROD_ORIGIN ||
    manifest.urls?.app ||
    "https://databox.infi.io.vn"
  ).replace(/\/$/, "");
}

const ORIGIN = parseOrigin(process.argv);
const MAX = Number(process.env.WAIT_MAX ?? 40);
const INTERVAL_MS = Number(process.env.WAIT_INTERVAL_MS ?? 5000);

console.log(`wait-prod-twofa-anon-key: origin=${ORIGIN}`);

for (let i = 1; i <= MAX; i++) {
  const html = await fetch(`${ORIGIN}/index.html?cb=${Date.now()}`).then((r) => r.text());
  const jsMatch = html.match(/assets\/(index-[^"]+\.js)/);
  if (!jsMatch) {
    console.log(`[${i}/${MAX}] no bundle`);
  } else {
    const js = await fetch(`${ORIGIN}/assets/${jsMatch[1]}?cb=${Date.now()}`).then((r) => r.text());
    const check = hasTwofaAnonInBundle(js);
    console.log(
      `[${i}/${MAX}] ${jsMatch[1]} TWOFA_ANON=${check.ok ? "YES" : "NO"} ${check.reason}`,
    );
    if (check.ok) process.exit(0);
  }
  if (i < MAX) await new Promise((r) => setTimeout(r, INTERVAL_MS));
}
process.exit(1);
