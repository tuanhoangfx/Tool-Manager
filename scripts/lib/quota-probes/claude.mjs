const CLAUDE_USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
const CLAUDE_PROFILE_URL = "https://api.anthropic.com/api/oauth/profile";

function metric(key, label, utilization, resetsAt) {
  const used =
    typeof utilization === "number" && Number.isFinite(utilization)
      ? Math.round(utilization)
      : null;
  return {
    key,
    label,
    used,
    limit: used != null ? 100 : null,
    remaining: used != null ? Math.max(0, 100 - used) : null,
    unit: "%",
    resetAt: resetsAt ?? null,
  };
}

function readUtilization(bucket) {
  if (!bucket || typeof bucket !== "object") return { utilization: null, resetsAt: null };
  return {
    utilization: typeof bucket.utilization === "number" ? bucket.utilization : null,
    resetsAt: typeof bucket.resets_at === "string" ? bucket.resets_at : null,
  };
}

export async function probeClaudeQuota(token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "anthropic-version": "2023-06-01",
    "anthropic-beta": "oauth-2025-04-20",
    "User-Agent": "P0020-Data-Box/1.0",
  };

  const usageRes = await fetch(CLAUDE_USAGE_URL, { headers });
  if (!usageRes.ok) {
    const text = await usageRes.text();
    throw new Error(`Claude usage ${usageRes.status}: ${text.slice(0, 200)}`);
  }
  const usage = await usageRes.json();

  let tierLabel = null;
  try {
    const profileRes = await fetch(CLAUDE_PROFILE_URL, { headers });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      tierLabel =
        profile?.subscription_tier ??
        profile?.plan_type ??
        profile?.account?.subscription_tier ??
        null;
    }
  } catch {
    /* optional */
  }

  const five = readUtilization(usage.five_hour);
  const seven = readUtilization(usage.seven_day);
  const sonnet = readUtilization(
    usage.seven_day_sonnet ?? usage.seven_day_sonnet_4 ?? usage.seven_day_model,
  );
  const extra = usage.extra_usage;

  const metrics = [
    metric("five_hour", "5h window", five.utilization, five.resetsAt),
    metric("seven_day", "7d window", seven.utilization, seven.resetsAt),
    metric("seven_day_sonnet", "7d Sonnet", sonnet.utilization, sonnet.resetsAt),
  ];

  if (extra?.is_enabled) {
    const extraUtil = readUtilization(extra);
    metrics.push(metric("extra_usage", "Extra usage", extraUtil.utilization, extraUtil.resetsAt));
  }

  return {
    platform: "claude",
    tierLabel,
    planLabel: tierLabel,
    metrics: metrics.filter((m) => m.used != null),
    raw: usage,
    probedAt: new Date().toISOString(),
  };
}

export async function probeAnthropicApiKey(token) {
  const res = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": token,
      "anthropic-version": "2023-06-01",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${text.slice(0, 200)}`);
  }
  return {
    platform: "claude",
    planLabel: "API key",
    metrics: [{ key: "api_reachable", label: "API reachable", used: 0, limit: 100, remaining: 100, unit: "%" }],
    raw: { models: "ok" },
    probedAt: new Date().toISOString(),
  };
}
