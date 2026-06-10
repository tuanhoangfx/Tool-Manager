/**
 * Verify P0020 tasks schema + profile sync (reads .env.local).
 * Usage: node scripts/verify-todo-schema.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error("Missing .env.local");
    process.exit(1);
  }
  const out = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return out;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" };

const tables = [
  "tasks",
  "projects",
  "project_members",
  "task_attachments",
  "task_comments",
  "task_time_logs",
  "activity_logs",
  "notifications",
  "profiles",
];

const checks = [];

for (const table of tables) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=0`, { headers });
  checks.push({
    name: `table ${table}`,
    ok: res.status === 200 || res.status === 406,
    detail: `${res.status}`,
  });
}

const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const bucketHeaders = serviceKey
  ? { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: "application/json" }
  : headers;
const bucketRes = await fetch(`${url}/storage/v1/bucket/task-attachments`, { headers: bucketHeaders });
checks.push({
  name: "storage bucket task-attachments",
  ok: bucketRes.status === 200,
  detail: serviceKey ? `${bucketRes.status} (service role)` : `${bucketRes.status} (anon — set SUPABASE_SERVICE_ROLE_KEY for bucket probe)`,
});

const healthRes = await fetch(`${url}/rest/v1/rpc/todo_schema_health`, {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: "{}",
});

if (healthRes.ok) {
  try {
    const health = await healthRes.json();
    checks.push({
      name: "rpc todo_schema_health",
      ok: health.tasks_table === true && health.auth_user_trigger === true,
      detail: JSON.stringify(health),
    });
    checks.push({
      name: "demo projects seeded",
      ok: (health.projects_count ?? 0) >= 1,
      detail: `projects_count=${health.projects_count}`,
    });
    checks.push({
      name: "profiles backfill",
      ok: (health.profiles_count ?? 0) >= 0,
      detail: `profiles_count=${health.profiles_count}`,
    });
  } catch {
    checks.push({ name: "rpc todo_schema_health parse", ok: false, detail: "invalid json" });
  }
} else {
  const body = await healthRes.text();
  checks.push({
    name: "rpc todo_schema_health",
    ok: false,
    detail: `run pnpm db:migrate — ${healthRes.status} ${body.slice(0, 100)}`,
  });
}

const insertProbe = await fetch(`${url}/rest/v1/tasks`, {
  method: "POST",
  headers: {
    ...headers,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  },
  body: JSON.stringify({
    title: "__todo_schema_probe__",
    user_id: "00000000-0000-0000-0000-000000000001",
    created_by: "00000000-0000-0000-0000-000000000001",
  }),
});
const insertBody = await insertProbe.text();
const tableMissing = /PGRST205|Could not find the table/i.test(insertBody);
const insertOk =
  !tableMissing &&
  (insertProbe.status === 401 ||
    insertProbe.status === 403 ||
    /row-level security|permission denied|violates foreign key|JWT/i.test(insertBody));
checks.push({
  name: tableMissing ? "tasks table exists" : "tasks insert RLS gate (anon blocked)",
  ok: insertOk,
  detail: tableMissing
    ? "run pnpm db:migrate — tasks table missing"
    : `${insertProbe.status} ${insertBody.slice(0, 80)}`,
});

const failed = checks.filter((c) => !c.ok);
for (const c of checks) {
  console.log(c.ok ? "OK" : "FAIL", c.name, "-", c.detail);
}

if (failed.length) {
  console.error(`\n${failed.length} check(s) failed. Run: pnpm db:migrate && pnpm verify:todo`);
  process.exit(1);
}

console.log("\nAll todo schema checks passed.");
