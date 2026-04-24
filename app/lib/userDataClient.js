export async function fetchCloudUserData() {
  const res = await fetch("/api/user-data", {
    cache: "no-store",
  });

  if (!res.ok) return null;

  return res.json();
}

export async function saveCloudUserData(payload) {
  const res = await fetch("/api/user-data", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload || {}),
  });

  const responseBody = await res.json().catch(() => ({}));

  if (!res.ok || responseBody?.ok === false) {
    const error = new Error(
      responseBody?.error || "Could not save data to cloud storage."
    );
    error.cloudSyncAvailable = Boolean(responseBody?.cloudSyncAvailable);
    throw error;
  }

  return responseBody;
}
