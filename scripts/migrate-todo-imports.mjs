#!/usr/bin/env node
/** One-shot: @/todo/* → relative imports inside src/features/todo (knip-friendly). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const productRoot = path.resolve(__dirname, "..");
const todoRoot = path.join(productRoot, "src", "features", "todo");

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

function toRelative(fromFile, importSubpath) {
  const target = importSubpath
    ? path.join(todoRoot, importSubpath.replace(/^\//, ""))
    : todoRoot;
  let rel = path.relative(path.dirname(fromFile), target).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}

function migrate(content, filePath) {
  return content.replace(
    /from\s+["']@\/todo(\/?[^"']*)["']/g,
    (_match, subpath) => `from "${toRelative(filePath, subpath || "")}"`,
  );
}

let changed = 0;
for (const file of walk(todoRoot)) {
  const before = fs.readFileSync(file, "utf8");
  const after = migrate(before, file);
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed++;
    console.log(path.relative(productRoot, file));
  }
}
console.log(`migrate-todo-imports: ${changed} file(s) updated`);
