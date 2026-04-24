export function resolveTransactionCacheUserKey({
  authenticatedUserId,
  cloudUserKey,
} = {}) {
  const normalizedCloudUserKey = String(cloudUserKey || "").trim();
  if (normalizedCloudUserKey) {
    return normalizedCloudUserKey;
  }

  const normalizedAuthenticatedUserId = String(authenticatedUserId || "").trim();
  return normalizedAuthenticatedUserId || null;
}

export function buildTransactionCacheKey(userKey) {
  const normalizedUserKey = String(userKey || "").trim();
  return normalizedUserKey ? `transactionCache:${normalizedUserKey}` : null;
}
