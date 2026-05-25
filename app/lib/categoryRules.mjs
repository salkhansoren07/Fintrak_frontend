function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeRuleValue(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeRuleField(field) {
  return normalizeText(field).toLowerCase();
}

function normalizeRuleOperator(operator) {
  return normalizeText(operator).toLowerCase();
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
  const field = normalizeRuleField(rule.field);
  const operator = normalizeRuleOperator(rule.operator);
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

export function buildCategoryRuleSignature(rule) {
  const field = normalizeRuleField(rule?.field);
  const operator = normalizeRuleOperator(rule?.operator);
  const value = normalizeRuleValue(rule?.value);

  if (!isSupportedField(field) || !isSupportedOperator(operator) || !value) {
    return null;
  }

  return `${field}:${operator}:${value}`;
}

export function normalizeCategoryRules(rules) {
  if (!Array.isArray(rules)) {
    return [];
  }

  const bySignature = new Map();
  const signatureById = new Map();

  for (const rule of rules) {
    const normalized = normalizeCategoryRule(rule);
    if (!normalized) {
      continue;
    }

    const signature = buildCategoryRuleSignature(normalized);
    if (!signature) {
      continue;
    }

    const priorSignature = signatureById.get(normalized.id);
    if (priorSignature) {
      bySignature.delete(priorSignature);
    }

    bySignature.delete(signature);
    bySignature.set(signature, normalized);
    signatureById.set(normalized.id, signature);
  }

  return [...bySignature.values()];
}

export function mergeCategoryRules(...ruleGroups) {
  return normalizeCategoryRules(ruleGroups.flat());
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
  const candidateSignature = buildCategoryRuleSignature(candidate);

  if (!candidateSignature) {
    return -1;
  }

  return normalizeCategoryRules(rules).findIndex(
    (rule) => buildCategoryRuleSignature(rule) === candidateSignature
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

  return transactions.map((transaction) => {
    const baseCategory = normalizeText(
      transaction?.baseCategory || transaction?.category
    );
    const nextBaseTransaction =
      transaction?.baseCategory === baseCategory
        ? transaction
        : {
            ...transaction,
            baseCategory,
          };

    if (overrides?.[transaction.id]) {
      if (overrides[transaction.id] === nextBaseTransaction.category) {
        return nextBaseTransaction;
      }

      return {
        ...nextBaseTransaction,
        category: overrides[transaction.id],
      };
    }

    const matchedRule = normalizedRules.find((rule) =>
      matchesCategoryRule(nextBaseTransaction, rule)
    );

    const nextCategory = matchedRule ? matchedRule.category : baseCategory;

    if (nextCategory === nextBaseTransaction.category) {
      return nextBaseTransaction;
    }

    return {
      ...nextBaseTransaction,
      category: nextCategory,
    };
  });
}
