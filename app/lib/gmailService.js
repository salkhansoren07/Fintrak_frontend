export async function fetchBankEmails(token) {
  const query =
    '(debited OR credited OR transaction OR txn OR upi OR utr OR withdrawn OR deposited OR "available bal" OR "a/c")';
  const headers = { Authorization: `Bearer ${token}` };

  const messages = [];
  let pageToken = null;

  do {
    const params = new URLSearchParams({ q: query, maxResults: "500" });
    if (pageToken) params.set("pageToken", pageToken);

    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
      { headers }
    );

    if (!listRes.ok) {
      let errorMessage = `Gmail list fetch failed: ${listRes.status}`;

      try {
        const errorBody = await listRes.json();
        const gmailStatus = errorBody?.error?.status;
        const gmailMessage = errorBody?.error?.message;

        if (gmailStatus || gmailMessage) {
          errorMessage =
            `Gmail list fetch failed: ${listRes.status}` +
            `${gmailStatus ? ` ${gmailStatus}` : ""}` +
            `${gmailMessage ? ` - ${gmailMessage}` : ""}`;
        }
      } catch {
        // Ignore JSON parsing errors and keep the status-only message.
      }

      throw new Error(errorMessage);
    }

    const listData = await listRes.json();
    if (Array.isArray(listData.messages)) {
      messages.push(...listData.messages);
    }
    pageToken = listData.nextPageToken || null;
  } while (pageToken);

  if (!messages.length) return [];

  const fetchMessage = async (id, attempt = 0) => {
    const r = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
      { headers }
    );

    if (!r.ok) {
      if (attempt < 1 && r.status >= 500) {
        return fetchMessage(id, attempt + 1);
      }
      throw new Error(`Gmail message fetch failed: ${r.status} (${id})`);
    }

    return r.json();
  };

  const detailResults = await Promise.allSettled(
    messages.map((msg) => fetchMessage(msg.id))
  );

  return detailResults
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);
}
