function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeRuleValue(value) {
  return normalizeText(value).toLowerCase();
}

function isSupportedField(field) {
  return field === "vpa" || field === "bank";
}

function isSupportedOperator(operator) {
  return operator === "contains" || operator === "equals";
}

function createRuleId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeCategoryRule(rule) {
  if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
    return null;
  }

  const id = normalizeText(rule.id);
  const field = normalizeText(rule.field).toLowerCase();
  const operator = normalizeText(rule.operator).toLowerCase();
  const value = normalizeText(rule.value);
  const category = normalizeText(rule.category);

  if (!id || !isSupportedField(field) || !isSupportedOperator(operator)) {
    return null;
  }

  if (!value || !category) {
    return null;
  }

  const createdAt =
    rule.createdAt === null || rule.createdAt === undefined
      ? null
      : Number(rule.createdAt);

  return {
    id,
    field,
    operator,
    value,
    category,
    enabled: rule.enabled !== false,
    createdAt: Number.isFinite(createdAt) ? createdAt : null,
  };
}

export function normalizeCategoryRules(rules) {
  if (!Array.isArray(rules)) {
    return [];
  }

  const byId = new Map();

  for (const rule of rules) {
    const normalized = normalizeCategoryRule(rule);
    if (!normalized) {
      continue;
    }

    byId.set(normalized.id, normalized);
  }

  return [...byId.values()];
}

export function mergeCategoryRules(...ruleGroups) {
  const merged = new Map();

  for (const rules of ruleGroups) {
    for (const rule of normalizeCategoryRules(rules)) {
      merged.set(rule.id, rule);
    }
  }

  return [...merged.values()];
}

export function getTransactionRuleCandidate(transaction) {
  const vpa = normalizeText(transaction?.vpa);
  if (vpa && vpa !== "N/A") {
    return {
      field: "vpa",
      operator: "contains",
      value: vpa,
      label: `VPA contains ${vpa}`,
    };
  }

  const bank = normalizeText(transaction?.bank);
  if (bank && bank !== "Other") {
    return {
      field: "bank",
      operator: "equals",
      value: bank,
      label: `Bank is ${bank}`,
    };
  }

  return null;
}

export function buildCategoryRuleFromTransaction(transaction, category) {
  const candidate = getTransactionRuleCandidate(transaction);
  const normalizedCategory = normalizeText(category);

  if (!candidate || !normalizedCategory) {
    return null;
  }

  return {
    id: createRuleId(),
    ...candidate,
    category: normalizedCategory,
    enabled: true,
    createdAt: Date.now(),
  };
}

export function findMatchingCategoryRuleIndex(rules, candidate) {
  const normalizedField = normalizeText(candidate?.field).toLowerCase();
  const normalizedOperator = normalizeText(candidate?.operator).toLowerCase();
  const normalizedValue = normalizeRuleValue(candidate?.value);

  return normalizeCategoryRules(rules).findIndex(
    (rule) =>
      rule.field === normalizedField &&
      rule.operator === normalizedOperator &&
      normalizeRuleValue(rule.value) === normalizedValue
  );
}

export function matchesCategoryRule(transaction, rule) {
  const normalizedRule = normalizeCategoryRule(rule);
  if (!normalizedRule || normalizedRule.enabled === false) {
    return false;
  }

  const transactionValue = normalizeText(transaction?.[normalizedRule.field]);
  if (!transactionValue || transactionValue === "N/A") {
    return false;
  }

  const left = normalizeRuleValue(transactionValue);
  const right = normalizeRuleValue(normalizedRule.value);

  if (normalizedRule.operator === "equals") {
    return left === right;
  }

  return left.includes(right);
}

export function applyCategoryRules(transactions = [], rules = [], overrides = {}) {
  const normalizedRules = normalizeCategoryRules(rules).filter(
    (rule) => rule.enabled !== false
  );

  if (!normalizedRules.length) {
    return [...transactions];
  }

  return transactions.map((transaction) => {
    if (overrides?.[transaction.id]) {
      if (overrides[transaction.id] === transaction.category) {
        return transaction;
      }

      return {
        ...transaction,
        category: overrides[transaction.id],
      };
    }

    const matchedRule = normalizedRules.find((rule) =>
      matchesCategoryRule(transaction, rule)
    );

    if (!matchedRule || matchedRule.category === transaction.category) {
      return transaction;
    }

    return {
      ...transaction,
      category: matchedRule.category,
    };
  });
}
