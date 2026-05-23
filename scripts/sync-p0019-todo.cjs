/**
 * Sync 100% P0019 Work Performance source into P0020 Todo embed.
 * Usage: node scripts/sync-p0019-todo.cjs
 */
const fs = require("fs");
const path = require("path");

const SRC = path.resolve(__dirname, "../../P0019-Work-Performance");
const DST = path.resolve(__dirname, "../src/features/todo/p0019");

const ROOT_FILES = ["App.tsx", "types.ts", "constants.ts", "translations.ts"];
const DIRS = ["components", "hooks", "lib", "context"];

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (!fs.existsSync(SRC)) {
  console.error("P0019 not found:", SRC);
  process.exit(1);
}

fs.mkdirSync(DST, { recursive: true });
for (const f of ROOT_FILES) {
  fs.copyFileSync(path.join(SRC, f), path.join(DST, f));
}
for (const d of DIRS) {
  copyDir(path.join(SRC, d), path.join(DST, d));
}

const appPath = path.join(DST, "App.tsx");
let app = fs.readFileSync(appPath, "utf8");
if (!app.includes("getP0019ThemeRoot")) {
  app = app.replace(
    "const AppContextProviders:",
    `/** Theme scope: P0020 hub embed */\nfunction getP0019ThemeRoot() {\n  return document.querySelector(".todo-p0019-root") ?? document.documentElement;\n}\n\nconst AppContextProviders:`,
  );
  app = app.replaceAll("window.document.documentElement", "getP0019ThemeRoot()");
  app = app.replace("min-h-screen font-sans", "min-h-0 h-full font-sans");
  fs.writeFileSync(appPath, app);
  console.log("Applied P0020 embed patches to App.tsx");
}

console.log("Synced P0019 ->", DST);
