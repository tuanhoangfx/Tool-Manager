export async function probeGrokApiKey(token) {
  const res = await fetch("https://api.x.ai/v1/models", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Grok API ${res.status}: ${text.slice(0, 200)}`);
  }
  const body = await res.json();
  const modelCount = Array.isArray(body?.data) ? body.data.length : 0;
  return {
    platform: "grok",
    planLabel: "xAI API",
    metrics: [
      {
        key: "models",
        label: "Models visible",
        used: modelCount,
        limit: null,
        remaining: null,
        unit: "models",
      },
    ],
    raw: body,
    probedAt: new Date().toISOString(),
  };
}
