const LEGACY_CATEGORY_OVERRIDES_KEY = "categoryOverrides";

function getStorage(storage) {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function buildCategoryOverridesStorageKey(userId) {
  return userId ? `categoryOverrides:${userId}` : null;
}

export function readCategoryOverrides(userId, storage) {
  const target = getStorage(storage);
  const storageKey = buildCategoryOverridesStorageKey(userId);

  if (!target || !storageKey) {
    return {};
  }

  try {
    const raw = target.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeCategoryOverrides(userId, overrides, storage) {
  const target = getStorage(storage);
  const storageKey = buildCategoryOverridesStorageKey(userId);

  if (!target || !storageKey) {
    return false;
  }

  target.setItem(storageKey, JSON.stringify(overrides || {}));
  return true;
}

export function clearLegacyCategoryOverrides(storage) {
  const target = getStorage(storage);
  if (!target) return;
  target.removeItem(LEGACY_CATEGORY_OVERRIDES_KEY);
}
