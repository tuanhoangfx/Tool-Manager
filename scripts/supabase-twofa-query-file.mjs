import { spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env.local");
const fileArg = process.argv[2];

if (!fileArg) {
  console.error("Usage: pnpm twofa:db:apply [path-to-sql]");
  process.exit(1);
}

function readEnv(key) {
  if (!existsSync(envPath)) return "";
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(new RegExp(`^${key}=(.+)$`));
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

const dbUrl = readEnv("TWOFA_SUPABASE_DB_URL");
if (!dbUrl || dbUrl.includes("[password]")) {
  console.error("Set TWOFA_SUPABASE_DB_URL in .env.local (pooler URI, real password).");
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
  { cwd: root, stdio: "inherit" },
);

child.on("exit", (code) => process.exit(code ?? 1));
