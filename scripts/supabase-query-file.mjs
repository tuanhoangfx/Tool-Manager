import { spawn } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";
import { loadP0020Env, resolveSupabaseDbUrl, supabaseDbUrlHint } from "./load-p0020-env.mjs";

const fileArg = process.argv[2];
if (!fileArg) {
  console.error("Usage: pnpm supabase:query:file <path-to-sql>");
  process.exit(1);
}

const { root, env, manifest } = loadP0020Env();
const dbUrl = resolveSupabaseDbUrl({ env, manifest });
if (!dbUrl) {
  const { template, note } = supabaseDbUrlHint(manifest);
  console.error("Missing SUPABASE_DB_URL (real password, not [DB_PASSWORD]).");
  console.error("Template:", template);
  console.error(note);
  process.exit(1);
}

const sqlFile = resolve(root, fileArg);
if (!existsSync(sqlFile)) {
  console.error(`SQL file not found: ${sqlFile}`);
  process.exit(1);
}

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const child = spawn(
  pnpm,
  ["exec", "supabase", "db", "query", "--db-url", dbUrl, "--file", sqlFile],
  {
    cwd: root,
    stdio: ["ignore", "inherit", "inherit"],
    shell: false,
  },
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
