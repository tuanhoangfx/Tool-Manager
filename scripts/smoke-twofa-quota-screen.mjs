#!/usr/bin/env node
/**
 * Static smoke — Account Vault Quota sub-route + nav child.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

const nav = read("src/lib/nav-structure.ts");
if (!nav.includes('view: "quota"') || !nav.includes('label: "Quota"')) {
  failures.push("nav-structure missing Quota child");
}

const path = read("src/lib/twofa-vault-path.ts");
if (!path.includes('quota: "quota"')) {
  failures.push("twofa-vault-path missing quota segment");
}

const screen = read("src/features/twofa/TwofaManagerScreen.tsx");
if (!screen.includes("TwofaQuotaBulkActionBar") || !screen.includes('vaultScope === "quota"')) {
  failures.push("TwofaManagerScreen does not mount Quota bulk actions in Services shell");
}

const quotaModal = read("src/features/quota/QuotaEnrollModal.tsx");
if (!quotaModal.includes("Stealth OAuth (P0003)") || !quotaModal.includes("startStealthQuotaEnroll")) {
  failures.push("QuotaEnrollModal missing P0003 Stealth OAuth enroll");
}

const migration = read("supabase-twofa/migrations/20260630120000_twofa_accounts_plan_quota.sql");
if (!migration.includes("plan_package") || !migration.includes("quota_snapshot")) {
  failures.push("plan/quota migration incomplete");
}

if (failures.length) {
  console.error("FAIL smoke-twofa-quota-screen:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("OK smoke-twofa-quota-screen");
