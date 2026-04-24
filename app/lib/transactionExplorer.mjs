function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeSearchValue(transaction) {
  return [
    transaction.bank,
    transaction.category,
    transaction.type,
    transaction.vpa,
    transaction.dateLabel,
    transaction.amount,
  ]
    .map((value) => normalizeText(value).toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function compareStrings(left, right) {
  return normalizeText(left).localeCompare(normalizeText(right), "en", {
    sensitivity: "base",
  });
}

export function createTransactionExplorerState() {
  return {
    search: "",
    bank: "all",
    category: "all",
    type: "all",
    sort: "date-desc",
  };
}

export function filterAndSortTransactions(
  transactions = [],
  explorer = createTransactionExplorerState()
) {
  const search = normalizeText(explorer.search).toLowerCase();

  return [...transactions]
    .filter((transaction) => {
      if (explorer.bank !== "all" && transaction.bank !== explorer.bank) {
        return false;
      }

      if (
        explorer.category !== "all" &&
        transaction.category !== explorer.category
      ) {
        return false;
      }

      if (explorer.type !== "all" && transaction.type !== explorer.type) {
        return false;
      }

      if (search && !normalizeSearchValue(transaction).includes(search)) {
        return false;
      }

      return true;
    })
    .sort((left, right) => {
      switch (explorer.sort) {
        case "date-asc":
          return Number(left.timestamp || 0) - Number(right.timestamp || 0);
        case "amount-desc":
          return Number(right.amount || 0) - Number(left.amount || 0);
        case "amount-asc":
          return Number(left.amount || 0) - Number(right.amount || 0);
        case "bank-asc":
          return compareStrings(left.bank, right.bank);
        case "bank-desc":
          return compareStrings(right.bank, left.bank);
        case "category-asc":
          return compareStrings(left.category, right.category);
        case "category-desc":
          return compareStrings(right.category, left.category);
        case "date-desc":
        default:
          return Number(right.timestamp || 0) - Number(left.timestamp || 0);
      }
    });
}

function escapeCsvValue(value) {
  const normalized = normalizeText(value);
  if (normalized.includes(",") || normalized.includes('"') || normalized.includes("\n")) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }
  return normalized;
}

export function buildTransactionCsv(transactions = []) {
  const header = [
    "Date",
    "Timestamp",
    "Bank",
    "Type",
    "Category",
    "VPA",
    "Amount",
  ];

  const rows = transactions.map((transaction) => [
    transaction.dateLabel,
    transaction.timestamp,
    transaction.bank,
    transaction.type,
    transaction.category,
    transaction.vpa,
    transaction.amount,
  ]);

  return [header, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\n");
}
