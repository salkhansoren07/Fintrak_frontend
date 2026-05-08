function getStorage(storage) {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function buildCategoryRulesStorageKey(userId) {
  return userId ? `categoryRules:${userId}` : null;
}

export function readCategoryRules(userId, storage) {
  const target = getStorage(storage);
  const storageKey = buildCategoryRulesStorageKey(userId);

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

export function writeCategoryRules(userId, rules, storage) {
  const target = getStorage(storage);
  const storageKey = buildCategoryRulesStorageKey(userId);

  if (!target || !storageKey) {
    return false;
  }

  target.setItem(storageKey, JSON.stringify(Array.isArray(rules) ? rules : []));
  return true;
}
