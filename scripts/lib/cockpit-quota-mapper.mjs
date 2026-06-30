/** Map Cockpit platform account exports → P0020 quota_snapshot + vault patch fields. */

function metric(key, label, used, limit = 100, unit = "%", resetAt = null) {
  return {
    key,
    label,
    used: used ?? null,
    limit,
    remaining: used != null ? Math.max(0, limit - used) : null,
    unit,
    resetAt,
  };
}

function isoFromUnixSec(sec) {
  if (!sec || !Number.isFinite(sec)) return null;
  return new Date(sec * 1000).toISOString();
}

export function mapClaudeCockpitAccount(account) {
  const quota = account?.quota;
  const metrics = [];
  if (quota) {
    metrics.push(metric("five_hour", "5h window", quota.five_hour_percentage, 100, "%", isoFromUnixSec(quota.five_hour_reset_time)));
    metrics.push(metric("seven_day", "7d window", quota.seven_day_percentage, 100, "%", isoFromUnixSec(quota.seven_day_reset_time)));
    if (quota.seven_day_sonnet_percentage != null) {
      metrics.push(
        metric(
          "seven_day_sonnet",
          "7d Sonnet",
          quota.seven_day_sonnet_percentage,
          100,
          "%",
          isoFromUnixSec(quota.seven_day_sonnet_reset_time),
        ),
      );
    }
    if (quota.extra_usage_percentage != null) {
      metrics.push(
        metric("extra_usage", "Extra usage", quota.extra_usage_percentage, 100, "%", isoFromUnixSec(quota.extra_usage_reset_time)),
      );
    }
  }

  const credential = extractClaudeCredential(account);
  return {
    platform: "claude",
    email: account?.email ?? "",
    planPackage: account?.organization_name ?? account?.plan_type ?? null,
    planTier: account?.plan_type ?? null,
    quotaSnapshot: {
      platform: "claude",
      planLabel: account?.plan_type ?? null,
      tierLabel: account?.plan_type ?? null,
      metrics: metrics.filter((m) => m.used != null),
      raw: quota?.raw_data ?? quota ?? null,
      error: account?.quota_error?.message ?? null,
      probedAt: account?.usage_updated_at
        ? new Date(account.usage_updated_at).toISOString()
        : new Date().toISOString(),
    },
    quotaStatus: account?.quota_error ? "error" : metrics.length ? "ok" : credential ? "stale" : "no_credential",
    quotaCheckedAt: account?.usage_updated_at
      ? new Date(account.usage_updated_at).toISOString()
      : new Date().toISOString(),
    credential,
    cockpitId: account?.id ?? null,
    cockpitPlatform: "claude_manager",
  };
}

function extractClaudeCredential(account) {
  const raw = account?.claude_credentials_raw;
  if (raw && typeof raw === "object") {
    const access = raw.access_token ?? raw.accessToken;
    if (typeof access === "string" && access.length > 20) return access;
  }
  if (typeof account?.api_key === "string" && account.api_key.length > 20) return account.api_key;
  return null;
}

export function mapCodexCockpitAccount(account) {
  const quota = account?.quota;
  const metrics = [];
  if (quota) {
    const buckets = [
      ["primary", "Primary", quota.primary_used_percent ?? quota.five_hour_percentage],
      ["weekly", "Weekly", quota.weekly_used_percent ?? quota.seven_day_percentage],
    ];
    for (const [key, label, used] of buckets) {
      if (used != null) metrics.push(metric(key, label, used));
    }
  }
  const credential = account?.openai_api_key ?? account?.tokens?.access_token ?? account?.tokens?.account_id ?? null;
  return {
    platform: "openai",
    email: account?.email ?? "",
    planPackage: account?.plan_type ?? account?.account_name ?? "ChatGPT / Codex",
    planTier: account?.plan_type ?? account?.auth_file_plan_type ?? null,
    quotaSnapshot: {
      platform: "openai",
      planLabel: account?.plan_type ?? null,
      tierLabel: account?.plan_type ?? null,
      metrics,
      raw: quota ?? null,
      error: account?.quota_error?.message ?? null,
      probedAt: new Date().toISOString(),
    },
    quotaStatus: account?.quota_error ? "error" : metrics.length ? "ok" : credential ? "stale" : "no_credential",
    quotaCheckedAt: new Date().toISOString(),
    credential,
    cockpitId: account?.id ?? null,
    cockpitPlatform: "codex",
  };
}

function pickNumber(obj, ...keys) {
  if (!obj || typeof obj !== "object") return null;
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "number" && Number.isFinite(val)) return Math.round(val);
    if (typeof val === "string") {
      const n = Number.parseFloat(val);
      if (Number.isFinite(n)) return Math.round(n);
    }
  }
  return null;
}

function pathObj(root, ...keys) {
  let cur = root;
  for (const key of keys) {
    if (!cur || typeof cur !== "object") return null;
    cur = cur[key];
  }
  return cur && typeof cur === "object" ? cur : null;
}

export function mapCursorCockpitAccount(account) {
  const usage = account?.cursor_usage_raw;
  const plan = pathObj(usage, "individualUsage", "plan") ?? pathObj(usage, "individual_usage", "plan");
  const metrics = [];
  const totalPct = pickNumber(plan, "totalPercentUsed", "total_percent_used");
  const autoPct = pickNumber(plan, "autoPercentUsed", "auto_percent_used");
  const apiPct = pickNumber(plan, "apiPercentUsed", "api_percent_used");
  if (totalPct != null) metrics.push(metric("total", "Total usage", totalPct));
  if (autoPct != null) metrics.push(metric("auto", "Auto model", autoPct));
  if (apiPct != null) metrics.push(metric("api", "API usage", apiPct));
  if (account?.quota?.hourly_percentage != null) {
    metrics.push(metric("hourly", "Hourly", account.quota.hourly_percentage, 100, "%", isoFromUnixSec(account.quota.hourly_reset_time)));
  }
  if (account?.quota?.weekly_percentage != null) {
    metrics.push(metric("weekly", "Weekly", account.quota.weekly_percentage, 100, "%", isoFromUnixSec(account.quota.weekly_reset_time)));
  }

  const membership = account?.membership_type ?? account?.cursor_auth_raw?.stripeMembershipType ?? null;
  const credential = account?.access_token ?? account?.cursor_auth_raw?.accessToken ?? null;

  return {
    platform: "cursor",
    email: account?.email ?? "",
    planPackage: membership ? `Cursor ${membership}` : "Cursor",
    planTier: membership,
    quotaSnapshot: {
      platform: "cursor",
      planLabel: membership,
      tierLabel: membership,
      metrics: metrics.filter((m) => m.used != null),
      raw: usage ?? account?.quota ?? null,
      error: account?.quota_query_last_error ?? null,
      probedAt: account?.usage_updated_at
        ? new Date(account.usage_updated_at).toISOString()
        : new Date().toISOString(),
    },
    quotaStatus:
      account?.quota_query_last_error
        ? "error"
        : metrics.length
          ? "ok"
          : credential
            ? "stale"
            : "no_credential",
    quotaCheckedAt: account?.usage_updated_at
      ? new Date(account.usage_updated_at).toISOString()
      : new Date().toISOString(),
    credential,
    cockpitId: account?.id ?? null,
    cockpitPlatform: "cursor",
  };
}

export function mapGeminiCockpitAccount(account) {
  const quota = account?.quota;
  const usage = account?.gemini_usage_raw;
  const metrics = [];
  if (quota?.hourly_percentage != null) {
    metrics.push(metric("hourly", "Hourly", quota.hourly_percentage, 100, "%", isoFromUnixSec(quota.hourly_reset_time)));
  }
  if (quota?.weekly_percentage != null) {
    metrics.push(metric("weekly", "Weekly", quota.weekly_percentage, 100, "%", isoFromUnixSec(quota.weekly_reset_time)));
  }
  const totalPct = pickNumber(usage, "totalPercentUsed", "total_percent_used");
  const autoPct = pickNumber(usage, "autoPercentUsed", "auto_percent_used");
  const apiPct = pickNumber(usage, "apiPercentUsed", "api_percent_used");
  if (totalPct != null) metrics.push(metric("total", "Total", totalPct));
  if (autoPct != null) metrics.push(metric("auto", "Auto", autoPct));
  if (apiPct != null) metrics.push(metric("api", "API", apiPct));

  const planName = account?.plan_name ?? account?.tier_id ?? account?.plan_type ?? null;
  const credential = account?.access_token ?? account?.refresh_token ?? null;
  return {
    platform: "gemini",
    email: account?.email ?? account?.account_email ?? "",
    planPackage: planName ?? "Gemini",
    planTier: planName,
    quotaSnapshot: {
      platform: "gemini",
      planLabel: planName,
      tierLabel: planName,
      metrics: metrics.filter((m) => m.used != null),
      raw: usage ?? quota ?? null,
      error: account?.quota_query_last_error ?? null,
      probedAt: account?.usage_updated_at
        ? new Date(account.usage_updated_at).toISOString()
        : new Date().toISOString(),
    },
    quotaStatus:
      account?.quota_query_last_error
        ? "error"
        : metrics.length
          ? "ok"
          : credential
            ? "stale"
            : "no_credential",
    quotaCheckedAt: account?.usage_updated_at
      ? new Date(account.usage_updated_at).toISOString()
      : new Date().toISOString(),
    credential,
    cockpitId: account?.id ?? null,
    cockpitPlatform: "gemini",
  };
}

const PLATFORM_MAPPERS = {
  claude_manager: mapClaudeCockpitAccount,
  claude: mapClaudeCockpitAccount,
  codex: mapCodexCockpitAccount,
  gemini: mapGeminiCockpitAccount,
  cursor: mapCursorCockpitAccount,
};

export function mapCockpitAccount(platformKey, account) {
  const mapper = PLATFORM_MAPPERS[platformKey];
  if (!mapper) return null;
  return mapper(account);
}

export function normalizeEmail(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function buildCockpitCredentialNote(existingNote, mapped) {
  const payload = {
    source: "cockpit",
    cockpitPlatform: mapped.cockpitPlatform,
    cockpitId: mapped.cockpitId,
    importedAt: new Date().toISOString(),
  };
  if (mapped.credential) {
    payload.access_token = mapped.credential;
  }
  const block = `Cockpit credential:\n${JSON.stringify(payload)}`;
  if (!existingNote?.trim()) return block;
  if (existingNote.includes('"source":"cockpit"') || existingNote.includes("Cockpit credential:")) {
    return existingNote.replace(/Cockpit credential:[\s\S]*?(?=\n[A-Z][a-z]+:|$)/, block);
  }
  return `${existingNote.trim()}\n\n${block}`;
}

/** Default Quota sync scope — only Google (Gemini) + Cursor from Cockpit. */
export const COCKPIT_QUOTA_TARGET_PLATFORMS = ["cursor", "gemini"];

export function serviceLabelForCockpitPlatform(platformKey) {
  if (platformKey === "cursor") return "Cursor";
  if (platformKey === "gemini") return "Gemini";
  if (platformKey === "codex") return "ChatGPT";
  if (platformKey === "claude_manager" || platformKey === "claude") return "Claude";
  return platformKey;
}

export const COCKPIT_INDEX_FILES = [
  { platform: "gemini", index: "gemini_accounts.json", detailDir: "gemini_accounts" },
  { platform: "cursor", index: "cursor_accounts.json", detailDir: "cursor_accounts" },
  { platform: "claude_manager", index: "claude_accounts.json", detailDir: "claude_accounts" },
  { platform: "codex", index: "codex_accounts.json", detailDir: "codex_accounts" },
  { platform: "github-copilot", index: "github_copilot_accounts.json", detailDir: "github_copilot_accounts" },
];
