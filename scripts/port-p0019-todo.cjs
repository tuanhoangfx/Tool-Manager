/**
 * OPTIONAL legacy sync — copy P0019 task files into P0020 src/features/todo/
 * P0020 Todo is standalone; run only when intentionally re-syncing from P0019 before decommission.
 * Usage: node scripts/port-p0019-todo.cjs
 */
const fs = require("fs");
const path = require("path");

const SRC = path.resolve(__dirname, "../../P0019-Work-Performance");
const DEST = path.resolve(__dirname, "../src/features/todo");

const SKIP_FILES = new Set([
  "App.tsx",
  "index.tsx",
  "vite.config.ts",
  "lib/supabase.ts",
  "hooks/useSupabaseAuth.ts",
  "context/ToastContext.tsx",
  "components/Header.tsx",
  "components/Footer.tsx",
  "components/TopBar.tsx",
  "components/Auth.tsx",
  "components/ToastContainer.tsx",
  "components/Toast.tsx",
  "components/header/AdminNav.tsx",
  "components/dashboard/admin/ManagementDashboard.tsx",
  "components/dashboard/admin/UserManagementDashboard.tsx",
  "components/dashboard/admin/ProjectManagementDashboard.tsx",
  "components/EditEmployeeModal.tsx",
  "components/dashboard/admin/ManageProjectMembersModal.tsx",
]);

const COPY_DIRS = ["hooks", "components", "context"];
const COPY_FILES = ["types.ts", "constants.ts", "translations.ts", "lib/taskUtils.ts"];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function shouldSkip(rel) {
  const norm = rel.replace(/\\/g, "/");
  if (SKIP_FILES.has(norm)) return true;
  if (norm.startsWith("hub/")) return true;
  return false;
}

function transform(content) {
  return content
    .replace(/from ['"]@\/App['"]/g, 'from "@/todo/app-types"')
    .replace(/from ['"]@\/lib\/supabase['"]/g, 'from "@/todo/lib/supabase"')
    .replace(/from ['"]@\/context\/ToastContext['"]/g, 'from "@/todo/context/ToastContext"')
    .replace(/from ['"]@\/todo\//g, 'from "@/todo/__KEEP__/')
    .replace(/from ['"]@\/([^'"]+)['"]/g, 'from "@/todo/$1"')
    .replace(/from ['"]@\/todo\/__KEEP__\//g, 'from "@/todo/');
}

function copyFile(srcPath, destPath) {
  let content = fs.readFileSync(srcPath, "utf8");
  content = transform(content);
  ensureDir(path.dirname(destPath));
  fs.writeFileSync(destPath, content, "utf8");
}

ensureDir(DEST);

for (const f of COPY_FILES) {
  const src = path.join(SRC, f);
  if (!fs.existsSync(src)) continue;
  copyFile(src, path.join(DEST, f));
}

for (const dir of COPY_DIRS) {
  const srcDir = path.join(SRC, dir);
  if (!fs.existsSync(srcDir)) continue;
  const walk = (current, rel = "") => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (shouldSkip(relPath)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full, relPath);
      else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        copyFile(full, path.join(DEST, relPath));
      }
    }
  };
  walk(srcDir, dir);
}

console.log("Ported P0019 todo files to", DEST);
