import { apiFetch } from "./apiClient.js";

export async function fetchGmailTransactions(options = {}) {
  const suffix = options.forceRefresh ? "?refresh=1" : "";
  const res = await apiFetch(`/api/gmail-transactions${suffix}`, {
    cache: "no-store",
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(body?.error || "Failed to sync Gmail");
    error.status = res.status;
    throw error;
  }

  return body;
}
