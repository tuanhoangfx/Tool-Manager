#!/usr/bin/env node
/**
 * Hash required Vercel env keys from .env.local — skip redundant CLI sync when unchanged.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { readJson } = require("../../../scripts/lib/version-sync-lib.cjs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function vercelEnvHashFile(root) {
  return path.join(root, ".vercel-env-ship-hash");
}

function parseEnv(content) {
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[t.slice(0, eq).trim()] = val;
  }
  return out;
}

export function computeVercelEnvHash(root) {
  const manifest = readJson(path.join(root, "tool.manifest.json")) || {};
  const requiredKeys = manifest.vercelEnvValidation?.requiredKeys || [];
  const envPath = path.join(root, ".env.local");
  if (!requiredKeys.length || !fs.existsSync(envPath)) return "";
  const env = parseEnv(fs.readFileSync(envPath, "utf8"));
  const payload = requiredKeys.map((k) => `${k}=${env[k] ?? ""}`).join("\n");
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function readStoredVercelEnvHash(root) {
  const file = vercelEnvHashFile(root);
  if (!fs.existsSync(file)) return "";
  return fs.readFileSync(file, "utf8").trim();
}

export function writeStoredVercelEnvHash(root, hash) {
  if (!hash) return;
  fs.writeFileSync(vercelEnvHashFile(root), `${hash}\n`, "utf8");
}

export function shouldSkipVercelEnvSync(root) {
  const current = computeVercelEnvHash(root);
  if (!current) return false;
  return current === readStoredVercelEnvHash(root);
}
