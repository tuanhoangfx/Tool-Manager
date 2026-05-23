#!/usr/bin/env node
// Removes dead CSS selectors and dead siblings from comma-lists.
// Reads dead block list from find-dead-css.cjs via stdin or by re-running.
// Idempotent: if no dead blocks remain, exits cleanly.

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");

const raw = execSync(`node "${path.join(__dirname, "find-dead-css.cjs")}"`, { encoding: "utf8" });
const jsonEnd = raw.lastIndexOf("}");
const report = JSON.parse(raw.slice(0, jsonEnd + 1));

function parseBlocks(text) {
  const blocks = [];
  let i = 0;
  while (i < text.length) {
    const start = i;
    // Look for either `{` (rule starts) or `;` (at-rule statement ends) — pick whichever
    // comes first so we don't swallow `@import ...;` into a following rule selector.
    let braceAt = -1;
    let semicolonAt = -1;
    let j = i;
    while (j < text.length) {
      const ch = text[j];
      if (ch === "{") {
        braceAt = j;
        break;
      }
      if (ch === ";") {
        semicolonAt = j;
        break;
      }
      j++;
    }

    if (semicolonAt !== -1 && (braceAt === -1 || semicolonAt < braceAt)) {
      blocks.push({ type: "raw", text: text.slice(start, semicolonAt + 1) });
      i = semicolonAt + 1;
      continue;
    }

    if (braceAt === -1) {
      blocks.push({ type: "raw", text: text.slice(start) });
      break;
    }

    let depth = 1;
    let k = braceAt + 1;
    while (k < text.length && depth > 0) {
      if (text[k] === "{") depth++;
      else if (text[k] === "}") depth--;
      k++;
    }
    const selector = text.slice(start, braceAt);
    const body = text.slice(braceAt, k);
    blocks.push({ type: "rule", selector, body, raw: text.slice(start, k) });
    i = k;
  }
  return blocks;
}

function normalizeSelector(sel) {
  return sel.replace(/\s+/g, " ").trim();
}

let totalRemoved = 0;
let totalTrimmedSiblings = 0;

for (const [relPath, entry] of Object.entries(report)) {
  const file = path.join(ROOT, relPath);
  const text = fs.readFileSync(file, "utf8");
  const blocks = parseBlocks(text);

  const deadSet = new Set(entry.dead.map((s) => normalizeSelector(s)));
  const partialMap = new Map();
  for (const item of entry.partialDead) {
    partialMap.set(normalizeSelector(item.selector), new Set(item.deadParts.map(normalizeSelector)));
  }

  const out = [];
  for (const block of blocks) {
    if (block.type !== "rule") {
      out.push(block.text);
      continue;
    }
    const sel = normalizeSelector(block.selector);

    if (deadSet.has(sel)) {
      totalRemoved++;
      continue;
    }

    if (partialMap.has(sel)) {
      const deadParts = partialMap.get(sel);
      const parts = block.selector.split(",").map((s) => s.trim()).filter(Boolean);
      const kept = parts.filter((p) => !deadParts.has(normalizeSelector(p)));
      if (kept.length === 0) {
        totalRemoved++;
        continue;
      }
      totalTrimmedSiblings += parts.length - kept.length;
      const indent = block.selector.match(/^\s*/)[0];
      const newSelector = indent + kept.join(",\n");
      out.push(newSelector + block.body);
      continue;
    }

    out.push(block.raw);
  }

  // Collapse 3+ blank lines into 2
  const newText = out.join("").replace(/\n{3,}/g, "\n\n");
  fs.writeFileSync(file, newText);
  console.log(`Updated ${relPath}`);
}

console.log(`\nRemoved ${totalRemoved} dead blocks, trimmed ${totalTrimmedSiblings} dead siblings.`);
