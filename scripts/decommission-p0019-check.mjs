#!/usr/bin/env node
/**
 * Read-only checklist before retiring P0019-Work-Performance.
 * Does NOT delete or modify P0019 — reports remaining references only.
 * Usage: node scripts/decommission-p0019-check.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const devRoot = path.resolve(root, "..");
const p0019Root = path.join(devRoot, "P0019-Work-Performance");

const SCAN_ROOTS = [
  { label: "P0020 src", dir: path.join(root, "src") },
  { label: "P0020 scripts", dir: path.join(root, "scripts") },
  { label: "P0020 docs", dir: path.join(root, "docs") },
  { label: "P0020 supabase", dir: path.join(root, "supabase") },
];

const PATTERNS = [
  { id: "import-path", re: /P0019-Work-Performance/g },
  { id: "project-id", re: /ncsbudhkfwppdcmdrxhh/g },
  { id: "kanban-golden", re: /P0019\/kanban/g },
  { id: "port-script", re: /port-p0019-todo/g },
];

const JSON_PATHS = [
  "tool.manifest.json",
  "public/local-registry.json",
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?|mjs|cjs|css|json|md|sql)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const ALLOWLIST = new Set([
  "scripts/port-p0019-todo.cjs",
  "scripts/verify-todo-standalone.mjs",
  "scripts/decommission-p0019-check.mjs",
  "docs/RETIRED-HUB-SCREENS.md",
  "docs/DATABOX-MIGRATION.md",
  "supabase/migrations/20260609120000_tasks_schema.sql",
  "public/local-registry.json",
]);

const hits = [];

for (const { label, dir } of SCAN_ROOTS) {
  for (const file of walk(dir)) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    const text = fs.readFileSync(file, "utf8");
    for (const { id, re } of PATTERNS) {
      re.lastIndex = 0;
      const count = [...text.matchAll(re)].length;
      if (count && !ALLOWLIST.has(rel)) {
        hits.push({ scope: label, file: rel, pattern: id, count });
      }
    }
  }
}

for (const jsonRel of JSON_PATHS) {
  const file = path.join(root, jsonRel);
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const { id, re } of PATTERNS) {
    re.lastIndex = 0;
    const count = [...text.matchAll(re)].length;
    if (count && !ALLOWLIST.has(jsonRel)) {
      hits.push({ scope: "P0020 config", file: jsonRel, pattern: id, count });
    }
  }
}

const p0019Exists = fs.existsSync(p0019Root);
const todoStandalone = (() => {
  try {
    const r = fs.readFileSync(path.join(root, "scripts/verify-todo-standalone.mjs"), "utf8");
    return r.includes("verify-todo-standalone");
  } catch {
    return false;
  }
})();

console.log("=== P0019 Decommission Checklist (read-only) ===\n");
console.log(`P0019 folder exists: ${p0019Exists ? "YES (not deleted)" : "NO"}`);
console.log(`Todo standalone script present: ${todoStandalone ? "YES" : "NO"}`);
console.log(`P0020 references to P0019: ${hits.length ? hits.length + " hit(s)" : "none in scanned paths"}\n`);

if (hits.length) {
  console.log("Remaining references (review before decommission):\n");
  for (const h of hits) {
    console.log(`  [${h.pattern}] ${h.file} (${h.count}x) — ${h.scope}`);
  }
  console.log("");
}

console.log("Pre-decommission gates:");
const importHits = hits.filter(
  (h) => h.pattern === "import-path" && h.file.startsWith("src/") && !ALLOWLIST.has(h.file),
);
console.log(`  [${importHits.length ? "FAIL" : "PASS"}] No P0019 import paths in P0020 runtime code`);
console.log(`  [${hits.filter((h) => h.pattern === "project-id").length ? "WARN" : "PASS"}] No P0019 Supabase project id in P0020`);
console.log(`  [${hits.filter((h) => h.pattern === "kanban-golden").length ? "WARN" : "PASS"}] Golden path uses P0020/todo not P0019/kanban`);
console.log("\nRun: pnpm verify:todo && pnpm verify:todo:standalone before removing P0019.");
console.log("This script does NOT delete P0019.\n");

process.exit(importHits.length ? 1 : 0);
