#!/usr/bin/env node
/**
 * Poll production bundle until package.json version is embedded (post-deploy gate).
 *
 * Usage: node scripts/wait-prod-app-version.mjs [--origin URL] [--timeout-ms N] [--interval-ms N]
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { readJson } = require("../../scripts/lib/version-sync-lib.cjs");
const { waitForProductionVersion } = await import("../../scripts/lib/prod-version-probe.mjs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const out = { origin: "", timeoutMs: 300_000, intervalMs: 15_000 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--origin" && argv[i + 1]) out.origin = String(argv[++i]).replace(/\/$/, "");
    else if (a === "--timeout-ms" && argv[i + 1]) out.timeoutMs = Number(argv[++i]) || out.timeoutMs;
    else if (a === "--interval-ms" && argv[i + 1]) out.intervalMs = Number(argv[++i]) || out.intervalMs;
  }
  if (!out.origin) {
    const manifest = readJson(path.join(root, "tool.manifest.json")) || {};
    out.origin = String(
      process.env.P0020_PROD_ORIGIN || manifest.urls?.app || manifest.vercel?.productionUrl || "",
    ).replace(/\/$/, "");
  }
  return out;
}

const { origin, timeoutMs, intervalMs } = parseArgs(process.argv);
const expected = readJson(path.join(root, "package.json"))?.version || "?";

console.log(`wait-prod-app-version: origin=${origin} expected=v${expected} timeout=${timeoutMs}ms`);

const result = await waitForProductionVersion(root, {
  productionUrl: origin,
  timeoutMs,
  intervalMs,
});

if (result?.ok) {
  console.log(
    `wait-prod-app-version: OK v${result.expected} in ${result.scriptUrl || "bundle"} (${result.bundleBytes || "?"} bytes)`,
  );
  process.exit(0);
}

console.error("wait-prod-app-version: FAIL", JSON.stringify(result, null, 2));
process.exit(1);
