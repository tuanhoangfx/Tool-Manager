#!/usr/bin/env node
/**
 * Smoke: Infi Q&A sheet (gid=1075393871) keeps Category column after CSV parse.
 *
 * Usage:
 *   node scripts/smoke-sheet-category.mjs
 *   node scripts/smoke-sheet-category.mjs --gid 1075393871
 */
import { parseCsvToGrid } from "../src/features/sheet/sheet-csv-grid.ts";

const DOC_ID = "1lbywBrXnQ1sw6IChfWPlS-sjKp-SJ7pNBtsPL4jCaoo";
const DEFAULT_GID = "1075393871";

function parseGid(argv) {
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--gid" && argv[i + 1]) return argv[++i];
  }
  return DEFAULT_GID;
}

const gid = parseGid(process.argv);
const csvUrl = `https://docs.google.com/spreadsheets/d/${DOC_ID}/export?format=csv&gid=${gid}`;

console.log(`smoke-sheet-category: fetch ${csvUrl}`);
const res = await fetch(csvUrl, { redirect: "follow" });
if (!res.ok) {
  console.error(`FAIL HTTP ${res.status}`);
  process.exit(1);
}
const csv = await res.text();
const trimmed = csv.trimStart();
if (trimmed.startsWith("<!") || /^<html[\s>]/i.test(trimmed)) {
  console.error("FAIL — sheet not public (HTML response)");
  process.exit(1);
}

const { grid } = parseCsvToGrid(csv);
const categoryIdx = grid.header.findIndex((h) => /category/i.test(h));
if (categoryIdx < 0) {
  console.error("FAIL — Category column missing", grid.header);
  process.exit(1);
}
if (grid.header.length < 7) {
  console.error(`FAIL — expected ≥7 columns, got ${grid.header.length}`, grid.header);
  process.exit(1);
}

const sample = grid.rows[0]?.[categoryIdx] ?? "";
console.log(
  `smoke-sheet-category: ok — ${grid.header.length} cols, Category@${categoryIdx}="${String(sample).slice(0, 40)}"`,
);
