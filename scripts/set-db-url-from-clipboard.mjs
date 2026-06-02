/**
 * Reads Windows clipboard; if it looks like a Supabase pooler URI, writes SUPABASE_DB_URL to .env.local.
 * Usage: copy URI from Dashboard → Connect → Transaction pooler → Copy, then:
 *   node scripts/set-db-url-from-clipboard.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadP0020Env } from "./load-p0020-env.mjs";

const { root, env } = loadP0020Env();
const envPath = resolve(root, ".env.local");
const expectedRef =
  env.VITE_SUPABASE_URL?.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1] ?? null;

function readClipboard() {
  return execSync(
    "powershell -NoProfile -Command \"Get-Clipboard -Raw\"",
    { encoding: "utf8" },
  ).trim();
}

function normalizeUrl(raw) {
  const line = raw.split(/\r?\n/).find((l) => l.includes("postgresql://"));
  if (!line) return null;
  const url = line.trim().replace(/^["']|["']$/g, "");
  if (!url.startsWith("postgresql://")) return null;
  if (/\[YOUR-PASSWORD\]|\[DB_PASSWORD\]/i.test(url)) return null;
  if (expectedRef && !url.includes(expectedRef)) return null;
  return url;
}

const clip = readClipboard();
const url = normalizeUrl(clip);
if (!url) {
  console.error(
    expectedRef
      ? `Clipboard does not contain a valid pooler URI for project ${expectedRef}.`
      : "Clipboard does not contain a valid pooler URI. Set VITE_SUPABASE_URL in .env.local first.",
  );
  console.error("Copy from Supabase → Connect → Transaction pooler → URI → Copy.");
  process.exit(1);
}

let body = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const key = "SUPABASE_DB_URL";
const line = `${key}=${url}`;
if (new RegExp(`^${key}=`, "m").test(body)) {
  body = body.replace(new RegExp(`^${key}=.*$`, "m"), line);
} else {
  body = `${body.trimEnd()}\n\n# ${key} — Transaction pooler (pnpm apply:cookie)\n${line}\n`;
}
writeFileSync(envPath, body.endsWith("\n") ? body : `${body}\n`, "utf8");
console.log(`Updated ${envPath} with ${key}`);
