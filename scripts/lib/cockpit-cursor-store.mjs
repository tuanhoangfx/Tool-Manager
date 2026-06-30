import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { resolveCockpitDataDir } from "./cockpit-quota-import.mjs";

const INDEX_FILE = "cursor_accounts.json";
const DETAIL_DIR = "cursor_accounts";

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function accountIdFor(payload) {
  const seed = (
    payload.auth_id ??
    payload.email ??
    payload.access_token ??
    "cursor_user"
  )
    .toString()
    .toLowerCase();
  return `cursor_${crypto.createHash("md5").update(seed).digest("hex")}`;
}

function loadIndex(dataDir) {
  return readJson(path.join(dataDir, INDEX_FILE), { version: "1.0", accounts: [] });
}

function saveIndex(dataDir, index) {
  writeJson(path.join(dataDir, INDEX_FILE), index);
}

function loadDetail(dataDir, id) {
  return readJson(path.join(dataDir, DETAIL_DIR, `${id}.json`), null);
}

function saveDetail(dataDir, account) {
  writeJson(path.join(dataDir, DETAIL_DIR, `${account.id}.json`), account);
}

function refreshSummary(index, account) {
  const summary = {
    id: account.id,
    email: account.email,
    auth_id: account.auth_id ?? null,
    membership_type: account.membership_type ?? null,
    created_at: account.created_at,
    last_used: account.last_used,
  };
  const idx = index.accounts.findIndex((row) => row.id === account.id);
  if (idx >= 0) index.accounts[idx] = summary;
  else index.accounts.push(summary);
}

export function upsertCockpitCursorAccount(payload, dataDir = resolveCockpitDataDir()) {
  ensureDir(path.join(dataDir, DETAIL_DIR));
  const index = loadIndex(dataDir);
  const incomingAuth = payload.auth_id ?? null;
  const incomingEmail = (payload.email ?? "").trim().toLowerCase();

  let accountId = accountIdFor(payload);
  for (const item of index.accounts) {
    const existing = loadDetail(dataDir, item.id);
    if (!existing) continue;
    if (incomingAuth && existing.auth_id === incomingAuth) {
      accountId = existing.id;
      break;
    }
    if (incomingEmail && existing.email?.toLowerCase() === incomingEmail) {
      accountId = existing.id;
      break;
    }
  }

  const existing = loadDetail(dataDir, accountId);
  const now = nowSec();
  const account = {
    ...(existing ?? {}),
    id: accountId,
    email: payload.email || existing?.email || "",
    auth_id: payload.auth_id ?? existing?.auth_id ?? null,
    access_token: payload.access_token,
    refresh_token: payload.refresh_token ?? existing?.refresh_token ?? null,
    membership_type: payload.membership_type ?? existing?.membership_type ?? null,
    subscription_status: payload.subscription_status ?? existing?.subscription_status ?? null,
    sign_up_type: payload.sign_up_type ?? existing?.sign_up_type ?? null,
    cursor_auth_raw: payload.cursor_auth_raw ?? existing?.cursor_auth_raw ?? null,
    cursor_usage_raw: payload.cursor_usage_raw ?? existing?.cursor_usage_raw ?? null,
    usage_updated_at: payload.usage_updated_at ?? existing?.usage_updated_at ?? null,
    created_at: existing?.created_at ?? now,
    last_used: now,
  };

  saveDetail(dataDir, account);
  refreshSummary(index, account);
  saveIndex(dataDir, index);
  return account;
}

export async function refreshCockpitCursorAccount(account, dataDir = resolveCockpitDataDir()) {
  const token = account.access_token;
  if (!token) return account;

  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  try {
    const metaRes = await fetch("https://api2.cursor.sh/aiserver.v1.AuthService/GetUserMeta", {
      method: "POST",
      headers,
      body: "{}",
    });
    if (metaRes.ok) {
      const meta = await metaRes.json();
      if (meta.email) account.email = meta.email;
      if (meta.signUpType) account.sign_up_type = meta.signUpType;
      if (meta.workosId && !account.auth_id) account.auth_id = meta.workosId;
      account.cursor_auth_raw = {
        ...(account.cursor_auth_raw ?? {}),
        accessToken: token,
        refreshToken: account.refresh_token,
        cachedEmail: meta.email ?? account.cursor_auth_raw?.cachedEmail,
        cachedSignUpType: meta.signUpType ?? account.cursor_auth_raw?.cachedSignUpType,
        workosId: meta.workosId ?? account.cursor_auth_raw?.workosId,
        authId: account.auth_id ?? account.cursor_auth_raw?.authId,
      };
    }
  } catch {
    /* keep partial */
  }

  try {
    const stripeRes = await fetch("https://api2.cursor.sh/auth/full_stripe_profile", { headers });
    if (stripeRes.ok) {
      const profile = await stripeRes.json();
      const membership =
        profile.membershipType ??
        profile.membership_type ??
        profile.individualMembershipType ??
        profile.individual_membership_type;
      if (membership) {
        account.membership_type = membership;
        account.cursor_auth_raw = {
          ...(account.cursor_auth_raw ?? {}),
          stripeMembershipType: membership,
          stripeSubscriptionStatus:
            profile.subscriptionStatus ?? profile.subscription_status ?? account.subscription_status,
        };
      }
      if (profile.subscriptionStatus ?? profile.subscription_status) {
        account.subscription_status = profile.subscriptionStatus ?? profile.subscription_status;
      }
    }
  } catch {
    /* keep partial */
  }

  try {
    const sub = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    if (sub) {
      const padded = sub + "=".repeat((4 - (sub.length % 4)) % 4);
      const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
      const userId = String(payload.sub ?? "").split("|").pop();
      if (userId?.startsWith("user_")) {
        const cookie = `WorkosCursorSessionToken=${userId}%3A%3A${token}`;
        const usageRes = await fetch("https://cursor.com/api/usage-summary", {
          headers: {
            Accept: "application/json",
            Cookie: cookie,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          },
        });
        if (usageRes.ok) {
          account.cursor_usage_raw = await usageRes.json();
          account.usage_updated_at = nowSec();
        }
      }
    }
  } catch {
    /* keep partial */
  }

  return upsertCockpitCursorAccount(account, dataDir);
}
