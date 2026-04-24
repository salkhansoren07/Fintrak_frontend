export async function fetchAiInsights(
  transactions,
  signal,
  { forceRefresh = false } = {}
) {
  const res = await fetch("/api/ai/insights", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transactions, forceRefresh }),
    cache: "no-store",
    signal,
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(body?.error || "Failed to load AI insights");
    error.status = res.status;
    throw error;
  }

  return body;
}
