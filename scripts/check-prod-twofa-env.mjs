#!/usr/bin/env node
/** Check if production bundle embeds 2FA Supabase URL + anon key. */
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
  return (manifest.urls?.app || "https://databox.infi.io.vn").replace(/\/$/, "");
}

const ORIGIN = parseOrigin(process.argv);
const html = await fetch(`${ORIGIN}/index.html?cb=${Date.now()}`).then((r) => r.text());
const jsMatch = html.match(/assets\/(index-[^"]+\.js)/);
if (!jsMatch) {
  console.error("No index bundle in production HTML");
  process.exit(1);
}
const bundleUrl = `${ORIGIN}/assets/${jsMatch[1]}`;
console.log("bundle", bundleUrl);
const js = await fetch(bundleUrl).then((r) => r.text());
const hasTwofaRef = js.includes("zurfouqanjcubgneuctp");
const anon = hasTwofaAnonInBundle(js);
console.log("VITE_TWOFA_URL_IN_PROD", hasTwofaRef ? "YES" : "NO");
console.log("VITE_TWOFA_ANON_IN_PROD", anon.ok ? "YES" : "NO");
process.exit(anon.ok ? 0 : 1);
