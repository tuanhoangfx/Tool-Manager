#!/usr/bin/env node
/**
 * Static verify for Todo tab golden chrome (icons, prefs, CSS, user directory).
 * Usage: node scripts/verify-todo-chrome.mjs
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

const checks = [
  {
    file: "src/features/todo/todo-header-stats.ts",
    must: ["SpinnerIcon", "text-indigo-500 animate-spin"],
    mustNot: ["Loader2"],
  },
  {
    file: "src/features/todo/todo-kpi.ts",
    must: ["TodoInProgressIcon"],
    mustNot: ["Loader2"],
  },
  {
    file: "src/features/todo/todo-icons.tsx",
    must: ["SpinnerIcon", "todo-inprogress-icon"],
  },
  {
    file: "src/features/todo/todo-display-prefs.ts",
    must: ["TODO_KPI_DEFS", "TODO_CHART_DEFS", "TODO_HEADER_STAT_DEFS", "DEFAULT_TODO_KPI_KEYS"],
  },
  {
    file: "src/features/todo/todo-tab-prefs.ts",
    must: ["tkpi", "tcharts", "readTodoHubPrefs", "patchTodoHubPrefs"],
    mustNot: ["ccharts"],
  },
  {
    file: "src/features/todo/TodoHubChrome.tsx",
    must: [
      "useResolvedVisibleKpiKeys",
      "useResolvedVisibleChartKeys",
      "MiniBarChart",
      "readTodoHubPrefs",
      "screenFilters={chrome.filterDefs}",
    ],
  },
  {
    file: "src/features/workspace/WorkspaceTabDisplayPrefs.tsx",
    must: ['screen === "todo"', "readTodoHubPrefs", "patchTodoHubPrefs", 'filterParam="tfilt"'],
  },
  {
    file: "src/features/todo/styles/todo-hub-theme.css",
    must: [".todo-hub-column__scroll", "padding: 0"],
    mustNot: ["scrollbar-gutter: stable"],
  },
  {
    file: "src/lib/workspace-user-directory.ts",
    must: ["workspace_user_directory", "directoryRowToProfile", "fetchWorkspaceUserDirectory"],
  },
  {
    file: "src/features/todo/hooks/useProfileAndUsers.ts",
    must: ["fetchWorkspaceUserDirectory"],
    mustNot: ["useLocalStorage", "from('profiles').select('*')"],
  },
  {
    file: "src/features/todo/TodoAppCore.tsx",
    must: ["TodoUsersProvider", "EmployeeDashboard"],
    mustNot: ["lazy(() => import"],
  },
  {
    file: "src/features/todo/components/TaskCard.tsx",
    must: ["useTodoUsers"],
    mustNot: ["all_users", "useLocalStorage"],
  },
  {
    file: "src/features/todo/todo-charts.ts",
    must: ["buildTodoChartItems", "statusItems", "priorityItems"],
  },
];

const errors = [];

for (const { file, must = [], mustNot = [] } of checks) {
  let text;
  try {
    text = read(file);
  } catch (e) {
    errors.push(String(e.message ?? e));
    continue;
  }
  for (const token of must) {
    if (!text.includes(token)) errors.push(`${file}: expected "${token}"`);
  }
  for (const token of mustNot) {
    if (text.includes(token)) errors.push(`${file}: must not contain "${token}"`);
  }
}

if (errors.length) {
  console.error("Todo chrome verify failed:\n");
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}

console.log("Todo chrome verify OK — icons, prefs, user directory RPC, kanban padding.");
