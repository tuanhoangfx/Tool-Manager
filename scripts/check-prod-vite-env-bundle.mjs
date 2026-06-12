#!/usr/bin/env node
/**
 * Post-deploy: verify production bundle embeds required VITE_* values from .env.local
 * (keys listed in tool.manifest.json → vercelEnvValidation.requiredKeys).
 *
 * Usage: node scripts/check-prod-vite-env-bundle.mjs [--origin URL]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import {
  bundleContainsLiteral,
  fetchProductionBundle,
} from "../../scripts/lib/prod-bundle-fetch.mjs";

const require = createRequire(import.meta.url);
const { readJson } = require("../../scripts/lib/version-sync-lib.cjs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function parseOrigin(argv) {
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) return argv[++i].replace(/\/$/, "");
  }
  const manifest = readJson(path.join(root, "tool.manifest.json")) || {};
  return (manifest.urls?.app || manifest.vercel?.productionUrl || "").replace(/\/$/, "");
}

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[t.slice(0, eq).trim()] = val;
  }
  return out;
}

const manifest = readJson(path.join(root, "tool.manifest.json")) || {};
const requiredKeys = manifest.vercelEnvValidation?.requiredKeys || [];
if (!requiredKeys.length) {
  console.log("check-prod-vite-env-bundle: skip (no requiredKeys)");
  process.exit(0);
}

const localEnv = parseEnvFile(path.join(root, ".env.local"));
const origin = parseOrigin(process.argv);
const CHATCENTER_FALLBACK_HOST = "chathub.infi.io.vn";
const { bundleUrl, bundleUrls, body, bytes } = await fetchProductionBundle(origin, {
  allChunks: true,
});
console.log(`check-prod-vite-env-bundle: origin=${origin}`);
console.log(`bundles ${bundleUrls?.length ?? 1} chunk(s), primary ${bundleUrl} (${bytes} bytes total)`);

let failed = 0;
for (const key of requiredKeys) {
  const expected = localEnv[key];
  if (!expected) {
    console.error(`FAIL ${key}: missing in .env.local`);
    failed++;
    continue;
  }
  let ok = bundleContainsLiteral(body, expected);
  if (!ok && key === "VITE_CHATCENTER_WORKER_URL") {
    ok =
      bundleContainsLiteral(body, expected) ||
      bundleContainsLiteral(body, CHATCENTER_FALLBACK_HOST);
  }
  console.log(`${key}: ${ok ? "OK" : "MISSING"} (${expected.slice(0, 48)}${expected.length > 48 ? "…" : ""})`);
  if (!ok) failed++;
}

process.exit(failed ? 1 : 0);
