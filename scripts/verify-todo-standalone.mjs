#!/usr/bin/env node
/**
 * Verify P0020 Todo tab has no runtime dependency on P0019-Work-Performance.
 * Usage: node scripts/verify-todo-standalone.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const todoDir = path.join(root, "src/features/todo");

const forbidden = [
  /P0019-Work-Performance/i,
  /from ['"]@\/(?!todo)/,
  /ncsbudhkfwppdcmdrxhh/,
  /import\.meta\.env\.VITE_SUPABASE_URL\s*\?\?\s*['"]https:\/\/ncsb/,
];

const allowPortScript = /scripts\/port-p0019-todo\.cjs$/;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?|css|json)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = walk(todoDir);
const issues = [];

for (const file of files) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const text = fs.readFileSync(file, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(text)) {
      issues.push({ file: rel, pattern: pattern.source });
    }
  }
}

const srcFiles = walk(path.join(root, "src")).filter((f) => !f.includes(`${path.sep}features${path.sep}todo${path.sep}`));
for (const file of srcFiles) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  if (allowPortScript.test(rel)) continue;
  const text = fs.readFileSync(file, "utf8");
  if (/from ['"].*P0019-Work-Performance/.test(text) || /import\(['"].*P0019-Work-Performance/.test(text)) {
    issues.push({ file: rel, pattern: "P0019 import path" });
  }
}

if (issues.length) {
  console.error("Todo standalone check failed:\n");
  for (const i of issues) console.error(`  ${i.file} — ${i.pattern}`);
  process.exit(1);
}

const hubThemeFiles = [
  "src/features/todo/styles/todo-hub-theme.css",
  "src/features/todo/styles/todo-hub-classes.ts",
];
for (const rel of hubThemeFiles) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error(`Todo standalone check failed: missing ${rel}`);
    process.exit(1);
  }
}

const hubClasses = fs.readFileSync(path.join(root, hubThemeFiles[1]), "utf8");
if (!hubClasses.includes("export const TODO_HUB")) {
  console.error("Todo standalone check failed: TODO_HUB export missing in todo-hub-classes.ts");
  process.exit(1);
}

console.log(`Todo standalone OK — ${files.length} files under src/features/todo, no P0019 runtime deps, Hub theme tokens present.`);
