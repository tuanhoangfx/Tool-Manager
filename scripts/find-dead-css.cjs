#!/usr/bin/env node
// Scan src/styles/*.css and src/**/*.{ts,tsx}. For each top-level class
// selector, check if any of its class tokens appears anywhere in the JSX
// source. Reports selectors whose ALL tokens are unused (= dead candidates).
//
// Conservative: treats prefix matches as used (e.g. `freshness-fresh` matches
// a template `freshness-${level}`), so dynamic class names will not be
// flagged falsely.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const STYLES_DIR = path.join(SRC, "styles");

function walk(dir, exts) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, exts));
    else if (exts.some((ext) => entry.name.endsWith(ext))) out.push(full);
  }
  return out;
}

const tsxFiles = walk(SRC, [".ts", ".tsx"]).filter((p) => !p.endsWith(".test.ts"));
const tsxText = tsxFiles.map((p) => fs.readFileSync(p, "utf8")).join("\n");

// Collect static class tokens used in JSX. Sources:
//   1. className="foo bar"      → ["foo", "bar"]
//   2. className={`foo bar`}    → ["foo", "bar"] (literal part only)
//   3. className={... "foo" ...} → ["foo"] (string literal inside expression)
//   4. Dynamic prefix `tone-${x}` → prefix "tone-" so any `.tone-*` class lives
const staticTokens = new Set();
const dynamicPrefixes = new Set();

function harvestString(text) {
  for (const cls of text.split(/\s+/)) {
    if (/^[\w-]+$/.test(cls)) staticTokens.add(cls);
  }
}

// 1. className="..."
for (const m of tsxText.matchAll(/className\s*=\s*"([^"]+)"/g)) harvestString(m[1]);

// 2. className={`...`} and template literal content
for (const m of tsxText.matchAll(/`([^`]+)`/g)) {
  const body = m[1];
  // Capture dynamic prefixes: text right before ${...}
  for (const pm of body.matchAll(/([\w-]+-)\$\{/g)) {
    dynamicPrefixes.add(pm[1]);
  }
  // Treat literal parts (segments between ${...}) as static tokens too
  const literal = body.replace(/\$\{[^}]*\}/g, " ");
  harvestString(literal);
}

// 3. Quoted strings inside className={...} ternaries/expressions
for (const m of tsxText.matchAll(/className\s*=\s*\{([^}]+)\}/g)) {
  for (const sm of m[1].matchAll(/"([^"]+)"/g)) harvestString(sm[1]);
  for (const sm of m[1].matchAll(/'([^']+)'/g)) harvestString(sm[1]);
}

function isUsedToken(cls) {
  if (staticTokens.has(cls)) return true;
  for (const prefix of dynamicPrefixes) {
    if (cls.startsWith(prefix)) return true;
  }
  return false;
}

const cssFiles = walk(STYLES_DIR, [".css"]);
const report = {};

for (const file of cssFiles) {
  const text = fs.readFileSync(file, "utf8");
  // Capture top-level selector groups (line starts with . or comma-only)
  // by matching each rule block "{...}". Comma-separated selectors share a block.
  const blocks = [];
  let depth = 0;
  let selector = "";
  let body = "";
  let inBody = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (!inBody) {
      if (ch === "{") {
        inBody = true;
        depth = 1;
        body = "";
      } else {
        selector += ch;
      }
    } else {
      body += ch;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          blocks.push({ selector: selector.trim(), body });
          selector = "";
          body = "";
          inBody = false;
        }
      }
    }
  }

  const dead = [];
  const partialDead = [];
  for (const { selector } of blocks) {
    if (selector.startsWith("@")) continue;
    const parts = selector.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) continue;

    const partStatus = parts.map((part) => {
      const classes = [...part.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
      if (classes.length === 0) return { part, dead: false };
      return { part, dead: classes.every((c) => !isUsedToken(c)) };
    });

    const allDead = partStatus.every((s) => s.dead);
    if (allDead) {
      dead.push(selector);
      continue;
    }

    const deadParts = partStatus.filter((s) => s.dead).map((s) => s.part);
    if (deadParts.length > 0) {
      partialDead.push({ selector, deadParts });
    }
  }

  if (dead.length > 0 || partialDead.length > 0) {
    report[path.relative(ROOT, file)] = { dead, partialDead };
  }
}

console.log(JSON.stringify(report, null, 2));
const counts = Object.values(report).reduce(
  (acc, entry) => {
    acc.dead += entry.dead.length;
    acc.partial += entry.partialDead.length;
    return acc;
  },
  { dead: 0, partial: 0 },
);
console.log(`\nDead blocks: ${counts.dead}, partial-dead blocks: ${counts.partial}`);
