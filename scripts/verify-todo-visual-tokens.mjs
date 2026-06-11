#!/usr/bin/env node
/**
 * Ensure Todo status/priority hex tokens stay in sync across charts, CSS, and Kanban.
 * Usage: node scripts/verify-todo-visual-tokens.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) throw new Error(`Missing file: ${rel}`);
  return fs.readFileSync(full, "utf8");
}

function parseTokens(ts) {
  const status = {};
  const priority = {};
  const statusBlock = ts.match(/TODO_STATUS_HEX[^=]*=\s*\{([^}]+)\}/s);
  const priorityBlock = ts.match(/TODO_PRIORITY_HEX[^=]*=\s*\{([^}]+)\}/s);
  if (!statusBlock || !priorityBlock) throw new Error("Could not parse todo-visual-tokens.ts");

  for (const [, key, hex] of statusBlock[1].matchAll(/(\w+):\s*"(#[0-9a-f]{6})"/gi)) {
    status[key] = hex.toLowerCase();
  }
  for (const [, key, hex] of priorityBlock[1].matchAll(/(\w+):\s*"(#[0-9a-f]{6})"/gi)) {
    priority[key] = hex.toLowerCase();
  }
  return { status, priority };
}

function parseCssVars(css) {
  const vars = {};
  for (const [, name, hex] of css.matchAll(/--todo-(?:status|priority)-(\w+):\s*(#[0-9a-f]{6})/gi)) {
    vars[name.toLowerCase()] = hex.toLowerCase();
  }
  return vars;
}

const errors = [];

let tokens;
try {
  tokens = parseTokens(read("src/features/todo/todo-visual-tokens.ts"));
} catch (e) {
  console.error(String(e.message ?? e));
  process.exit(1);
}

const css = read("src/features/todo/styles/todo-hub-theme.css");
const cssVars = parseCssVars(css);

const expectedStatus = ["todo", "inprogress", "done", "cancelled"];
const expectedPriority = ["low", "medium", "high"];

for (const key of expectedStatus) {
  const hex = tokens.status[key];
  if (!hex) errors.push(`todo-visual-tokens.ts: missing status "${key}"`);
  if (cssVars[key] && hex && cssVars[key] !== hex) {
    errors.push(`CSS --todo-status-${key} (${cssVars[key]}) !== token (${hex})`);
  }
}

for (const key of expectedPriority) {
  const hex = tokens.priority[key];
  if (!hex) errors.push(`todo-visual-tokens.ts: missing priority "${key}"`);
  const cssHex = cssVars[key];
  if (cssHex && hex && cssHex !== hex) {
    errors.push(`CSS --todo-priority-${key} (${cssHex}) !== token (${hex})`);
  }
}

const charts = read("src/features/todo/todo-charts.ts");
if (!charts.includes("chartBreakdownFromPicker") || !charts.includes("buildTodoChartItems")) {
  errors.push("todo-charts.ts must use chartBreakdownFromPicker for KPI chart parity");
}

const taskColumn = read("src/features/todo/components/TaskColumn.tsx");
if (!taskColumn.includes("todo-hub-column--${status}")) {
  errors.push("TaskColumn.tsx must apply todo-hub-column--{status} modifier");
}

const themeChecks = [
  "rgb(255 255 255 / 0.018)",
  ".todo-hub-column--todo",
  ".todo-hub-column--cancelled",
];
for (const token of themeChecks) {
  if (!css.includes(token)) errors.push(`todo-hub-theme.css: expected "${token}"`);
}

const iconSources = [
  { file: "src/features/todo/todo-icons.tsx", must: ["TODO_STATUS_HEX"] },
  { file: "src/features/todo/todo-kanban-status.tsx", must: ["TODO_STATUS_HEX"] },
  { file: "src/features/todo/components/task-modal/TaskStatusStepper.tsx", must: ["TodoKanbanStatusIcon"] },
];
for (const { file, must } of iconSources) {
  const text = read(file);
  for (const token of must) {
    if (!text.includes(token)) errors.push(`${file}: expected "${token}"`);
  }
}

const taskStyles = read("src/features/todo/hooks/useTaskStyles.ts");
if (!taskStyles.includes("HUB_DIRECTORY_CARD_SURFACE")) {
  errors.push("useTaskStyles.ts must use HUB_DIRECTORY_CARD_SURFACE");
}

const kpi = read("src/features/todo/todo-kpi.ts");
for (const icon of ["TodoTodoIcon", "TodoInProgressIcon", "TodoDoneIcon", "TodoCancelledIcon"]) {
  if (!kpi.includes(icon)) errors.push(`todo-kpi.ts: expected ${icon}`);
}

if (errors.length) {
  console.error("Todo visual tokens verify failed:\n");
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}

console.log("Todo visual tokens verify OK — hex parity across charts, CSS, Kanban, KPI icons.");
