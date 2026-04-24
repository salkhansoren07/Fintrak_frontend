function getStorage(storage) {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function buildBudgetTargetsStorageKey(userId) {
  return userId ? `budgetTargets:${userId}` : null;
}

export function readBudgetTargets(userId, storage) {
  const target = getStorage(storage);
  const key = buildBudgetTargetsStorageKey(userId);

  if (!target || !key) {
    return {};
  }

  try {
    const raw = target.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeBudgetTargets(userId, budgetTargets, storage) {
  const target = getStorage(storage);
  const key = buildBudgetTargetsStorageKey(userId);

  if (!target || !key) {
    return false;
  }

  target.setItem(key, JSON.stringify(budgetTargets || {}));
  return true;
}
