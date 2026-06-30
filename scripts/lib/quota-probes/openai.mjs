export async function probeOpenAiApiKey(token) {
  const res = await fetch("https://api.openai.com/v1/models?limit=1", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API ${res.status}: ${text.slice(0, 200)}`);
  }

  let subscription = null;
  try {
    const subRes = await fetch("https://api.openai.com/v1/dashboard/billing/subscription", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (subRes.ok) subscription = await subRes.json();
  } catch {
    /* billing endpoint often requires session cookie */
  }

  const planLabel = subscription?.plan?.title ?? subscription?.plan?.id ?? "API key";
  const tierLabel = subscription?.plan?.id ?? null;

  return {
    platform: "openai",
    planLabel,
    tierLabel,
    metrics: [
      {
        key: "api_reachable",
        label: "API reachable",
        used: 0,
        limit: 100,
        remaining: 100,
        unit: "%",
      },
    ],
    raw: { subscription },
    probedAt: new Date().toISOString(),
  };
}
