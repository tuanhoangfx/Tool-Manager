#!/usr/bin/env node
/** Audit Cockpit Cursor + Gemini accounts vs P0020 Quota capability (no DB writes). */
import { loadCockpitQuotaSources, resolveCockpitDataDir } from "./lib/cockpit-quota-import.mjs";
import { COCKPIT_QUOTA_TARGET_PLATFORMS } from "./lib/cockpit-quota-mapper.mjs";
import fs from "node:fs";

const dataDir = resolveCockpitDataDir();
const accounts = loadCockpitQuotaSources({ dataDir });

console.log(`Cockpit dir: ${dataDir}`);
console.log(`Target platforms: ${COCKPIT_QUOTA_TARGET_PLATFORMS.join(", ")}`);
console.log(`Found: ${accounts.length} account(s)\n`);

for (const platform of COCKPIT_QUOTA_TARGET_PLATFORMS) {
  const index = platform === "cursor" ? "cursor_accounts.json" : "gemini_accounts.json";
  const exists = fs.existsSync(`${dataDir}/${index}`);
  console.log(`${platform}: index ${exists ? "yes" : "missing"}`);
}

if (!accounts.length) {
  console.log("\nNo Cursor/Gemini accounts in Cockpit — add them in Cockpit first or export backup JSON.");
  process.exit(0);
}

for (const row of accounts) {
  const m = row.quotaSnapshot?.metrics?.[0];
  const summary = m ? `${m.label} ${m.used}%` : row.quotaStatus;
  console.log(`\n${row.cockpitPlatform.toUpperCase()} ${row.email}`);
  console.log(`  plan: ${row.planPackage ?? "—"} / ${row.planTier ?? "—"}`);
  console.log(`  quota: ${summary}`);
  console.log(`  metrics: ${row.quotaSnapshot?.metrics?.length ?? 0}`);
  console.log(`  measurable: ${row.quotaStatus === "ok" ? "yes" : row.quotaStatus}`);
}

console.log("\nOK audit-cockpit-quota-targets");
