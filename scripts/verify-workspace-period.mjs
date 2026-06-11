#!/usr/bin/env node
/**
 * Static verify — golden workspace period (per-tab URL + HubWorkspacePeriodSelect).
 * Usage: node scripts/verify-workspace-period.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hubUi = path.resolve(root, "../../packages/hub-ui");

function read(base, rel) {
  const full = path.join(base, rel);
  if (!fs.existsSync(full)) throw new Error(`Missing file: ${rel}`);
  return fs.readFileSync(full, "utf8");
}

const checks = [
  {
    base: hubUi,
    file: "src/index.ts",
    must: ["useDebouncedValue", "useWorkspacePeriod", "HubWorkspacePeriodSelect"],
  },
  {
    base: path.resolve(root, "../../Tool/P0016-ChatCenter/vendor/hub-ui"),
    file: "src/index.ts",
    must: ["useDebouncedValue"],
  },
  {
    base: hubUi,
    file: "src/hooks/useDebouncedValue.ts",
    must: ["useDebouncedValue"],
  },
  {
    base: hubUi,
    file: "src/lib/hub-workspace-period.ts",
    must: ["nrange", "trange", "frange", "crange", "matchesWorkspacePeriod", "readWorkspacePeriod"],
  },
  {
    base: hubUi,
    file: "src/shell/HubWorkspacePeriodSelect.tsx",
    must: ["scope:", "useWorkspacePeriod", "HubPeriodSelect"],
  },
  {
    base: root,
    file: "src/features/notes/NotesHubChrome.tsx",
    must: ['scope: "notes"', "DirectorySearchToolbar", "HubWorkspacePeriodSelect"],
    mustNot: ["HubTimeRangeSelect"],
  },
  {
    base: root,
    file: "src/features/todo/todo-directory-toolbar.tsx",
    must: ['scope: "todo"', "DirectorySearchToolbar", "workspacePeriod"],
    mustNot: ["HubTimeRangeSelect"],
  },
  {
    base: root,
    file: "src/features/twofa/TwofaManagerScreen.tsx",
    must: ['scope: "twofa"', "DirectorySearchToolbar", "workspacePeriod"],
    mustNot: ["HubTimeRangeSelect"],
  },
  {
    base: root,
    file: "src/features/cookie/CookieAutoSyncTable.tsx",
    must: ['scope: "cookie"', "DirectorySearchToolbar", "workspacePeriod"],
    mustNot: ["HubTimeRangeSelect"],
  },
  {
    base: root,
    file: "src/features/todo/TodoChromeContext.tsx",
    must: ['useWorkspacePeriod("todo"'],
  },
  {
    base: root,
    file: "src/lib/hub-workspace-period.ts",
    must: ['from "@tool-workspace/hub-ui"'],
  },
];

let failed = 0;
for (const { base, file, must = [], mustNot = [] } of checks) {
  const src = read(base, file);
  for (const s of must) {
    if (!src.includes(s)) {
      console.error(`FAIL ${file}: missing "${s}"`);
      failed += 1;
    }
  }
  for (const s of mustNot) {
    if (src.includes(s)) {
      console.error(`FAIL ${file}: must not include "${s}"`);
      failed += 1;
    }
  }
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log(`verify-workspace-period: ${checks.length} files OK`);
