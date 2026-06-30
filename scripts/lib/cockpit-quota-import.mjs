import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  buildCockpitCredentialNote,
  COCKPIT_INDEX_FILES,
  COCKPIT_QUOTA_TARGET_PLATFORMS,
  mapCockpitAccount,
  normalizeEmail,
  serviceLabelForCockpitPlatform,
} from "./cockpit-quota-mapper.mjs";
import { resolvePlatform } from "./quota-probes/index.mjs";

export function resolveCockpitDataDir(explicit) {
  const fromEnv = process.env.COCKPIT_TOOLS_DATA_DIR?.trim();
  if (explicit?.trim()) return path.resolve(explicit.trim());
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(os.homedir(), ".antigravity_cockpit");
}

function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function normalizePlatforms(platforms) {
  const list = platforms?.length ? platforms : COCKPIT_QUOTA_TARGET_PLATFORMS;
  return new Set(list);
}

function listCockpitAccounts(dataDir, platforms = COCKPIT_QUOTA_TARGET_PLATFORMS) {
  const allowed = normalizePlatforms(platforms);
  const out = [];
  for (const spec of COCKPIT_INDEX_FILES) {
    if (!allowed.has(spec.platform)) continue;
    const indexPath = path.join(dataDir, spec.index);
    const index = readJsonSafe(indexPath);
    if (!index) continue;
    const rows = Array.isArray(index?.accounts) ? index.accounts : Array.isArray(index) ? index : [];
    for (const row of rows) {
      const id = row?.id ?? row?.account_id;
      let detail = row;
      if (id && spec.detailDir) {
        const detailPath = path.join(dataDir, spec.detailDir, `${id}.json`);
        const loaded = readJsonSafe(detailPath);
        if (loaded && typeof loaded === "object") detail = { ...row, ...loaded };
      }
      const mapped = mapCockpitAccount(spec.platform, detail);
      if (mapped?.email) out.push(mapped);
    }
  }
  return out;
}

function parseCockpitBackupJson(raw, platforms = COCKPIT_QUOTA_TARGET_PLATFORMS) {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  const allowed = normalizePlatforms(platforms);
  const out = [];

  const ingest = (platform, rows) => {
    if (!allowed.has(platform)) return;
    for (const row of rows) {
      const mapped = mapCockpitAccount(platform, row);
      if (mapped?.email) out.push(mapped);
    }
  };

  if (parsed?.schema === "cockpit-tools.data-transfer" && parsed?.accounts?.platforms) {
    for (const [platform, payload] of Object.entries(parsed.accounts.platforms)) {
      const exported = payload?.exported_data;
      const rows = Array.isArray(exported?.accounts)
        ? exported.accounts
        : Array.isArray(exported)
          ? exported
          : [];
      ingest(platform, rows);
    }
    return out;
  }

  if (parsed?.schema === "cockpit-tools.account-transfer" && parsed?.platforms) {
    for (const [platform, payload] of Object.entries(parsed.platforms)) {
      const exported = payload?.exported_data;
      const rows = Array.isArray(exported?.accounts)
        ? exported.accounts
        : Array.isArray(exported)
          ? exported
          : [];
      ingest(platform, rows);
    }
    return out;
  }

  if (Array.isArray(parsed)) {
    for (const row of parsed) {
      const platform = row?.platform ?? "claude_manager";
      ingest(platform, [row]);
    }
  }

  return out;
}

function matchVaultRow(rows, mapped) {
  const email = normalizeEmail(mapped.email);
  const cockpitId = mapped.cockpitId;
  return (
    rows.find((row) => {
      const note = row.note ?? "";
      if (cockpitId && note.includes(cockpitId)) return true;
      const emailMatch =
        normalizeEmail(row.account) === email || normalizeEmail(row.mail_recover) === email;
      if (!emailMatch) return false;
      return resolvePlatform(row.service) === mapped.platform;
    }) ?? null
  );
}

function quotaEnrolledIso(mapped) {
  return mapped.quotaCheckedAt ?? new Date().toISOString();
}

function buildQuotaOnlyCreate(mapped) {
  const service = serviceLabelForCockpitPlatform(mapped.cockpitPlatform);
  const note = buildCockpitCredentialNote("", mapped);
  const enrolledAt = quotaEnrolledIso(mapped);
  return {
    service,
    account: mapped.email,
    secret: "",
    password: mapped.credential ?? undefined,
    note,
    plan_package: mapped.planPackage,
    plan_tier: mapped.planTier,
    quota_snapshot: mapped.quotaSnapshot,
    quota_checked_at: mapped.quotaCheckedAt,
    quota_status: mapped.quotaStatus,
    quota_enrolled_at: enrolledAt,
    status: "active",
    ownership: "undefined",
  };
}

export function buildCockpitQuotaPatches(vaultRows, cockpitAccounts, { createMissing = true } = {}) {
  const patches = [];
  const creates = [];
  const skipped = [];
  for (const mapped of cockpitAccounts) {
    const row = matchVaultRow(vaultRows, mapped);
    if (row) {
      patches.push({
        id: row.id,
        plan_package: mapped.planPackage ?? row.plan_package,
        plan_tier: mapped.planTier ?? row.plan_tier,
        quota_snapshot: mapped.quotaSnapshot,
        quota_checked_at: mapped.quotaCheckedAt,
        quota_status: mapped.quotaStatus,
        quota_enrolled_at: row.quota_enrolled_at ?? quotaEnrolledIso(mapped),
        note: buildCockpitCredentialNote(row.note, mapped),
        password: !row.password?.trim() && mapped.credential ? mapped.credential : undefined,
      });
      continue;
    }
    if (createMissing) {
      creates.push(buildQuotaOnlyCreate(mapped));
    } else {
      skipped.push(mapped);
    }
  }
  return { patches, creates, unmatched: skipped };
}

export function loadCockpitQuotaSources({ dataDir, backupJson, backupPath, platforms } = {}) {
  const platformList = platforms ?? COCKPIT_QUOTA_TARGET_PLATFORMS;
  if (backupJson) return parseCockpitBackupJson(backupJson, platformList);
  if (backupPath) {
    const raw = fs.readFileSync(path.resolve(backupPath), "utf8");
    return parseCockpitBackupJson(raw, platformList);
  }
  const dir = resolveCockpitDataDir(dataDir);
  if (!fs.existsSync(dir)) {
    throw new Error(`Cockpit data dir not found: ${dir}`);
  }
  return listCockpitAccounts(dir, platformList);
}

export { listCockpitAccounts, parseCockpitBackupJson };
