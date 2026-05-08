const HISTORY_LIMIT = 12;

function getStorage(storage) {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function buildMlSyncHistoryStorageKey(userId) {
  return userId ? `mlSyncHistory:${userId}` : null;
}

export function readMlSyncHistory(userId, storage) {
  const target = getStorage(storage);
  const storageKey = buildMlSyncHistoryStorageKey(userId);

  if (!target || !storageKey) {
    return [];
  }

  try {
    const raw = target.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeMlSyncHistory(userId, entries, storage) {
  const target = getStorage(storage);
  const storageKey = buildMlSyncHistoryStorageKey(userId);

  if (!target || !storageKey) {
    return false;
  }

  target.setItem(
    storageKey,
    JSON.stringify(Array.isArray(entries) ? entries.slice(0, HISTORY_LIMIT) : [])
  );
  return true;
}

export function appendMlSyncHistory(userId, entry, storage) {
  const current = readMlSyncHistory(userId, storage);
  const next = [entry, ...current].slice(0, HISTORY_LIMIT);
  writeMlSyncHistory(userId, next, storage);
  return next;
}
