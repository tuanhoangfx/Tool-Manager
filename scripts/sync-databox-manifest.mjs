/**
 * Sync tool.manifest.json supabase block from .env.local VITE_SUPABASE_URL.
 * Usage: pnpm db:sync-manifest
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { loadP0020Env } from "./load-p0020-env.mjs";

const { root, env } = loadP0020Env();
const url = (env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
if (!url || !url.includes(".supabase.co")) {
  console.error("Set VITE_SUPABASE_URL in .env.local first (https://<ref>.supabase.co).");
  process.exit(1);
}

const refMatch = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
const projectRef = refMatch?.[1];
if (!projectRef) {
  console.error("Could not parse project ref from:", url);
  process.exit(1);
}

const regionHint =
  env.SUPABASE_DB_URL?.match(/aws-0-([a-z0-9-]+)\.pooler/)?.[1] ??
  process.env.DATABOX_REGION ??
  "ap-south-1";

function patchManifest(manifestPath) {
  if (!existsSync(manifestPath)) return;
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.supabase = {
    ...manifest.supabase,
    projectRef,
    url,
    dashboard: `https://supabase.com/dashboard/project/${projectRef}`,
    sqlEditor: `https://supabase.com/dashboard/project/${projectRef}/sql/new`,
    localEnv: {
      SUPABASE_DB_URL: `postgresql://postgres.${projectRef}:[DB_PASSWORD]@aws-0-${regionHint}.pooler.supabase.com:6543/postgres`,
      note: "Replace [DB_PASSWORD] in .env.local. Run `pnpm db:migrate` then `pnpm verify:cookie`.",
    },
    cookieBridge: {
      ...manifest.supabase?.cookieBridge,
      migrationsDir: "supabase/migrations",
      migrateDoc: "docs/DATABOX-MIGRATION.md",
      verify: "pnpm verify:cookie",
    },
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log("Updated", manifestPath);
}

patchManifest(resolve(root, "tool.manifest.json"));
patchManifest(resolve(root, "public/tool.manifest.json"));
console.log("projectRef:", projectRef);
