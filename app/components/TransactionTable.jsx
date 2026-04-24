"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Download, Search, SlidersHorizontal, X } from "lucide-react";
import { saveCloudUserData } from "../lib/userDataClient";
import {
  readCategoryOverrides,
  writeCategoryOverrides,
} from "../lib/categoryOverridesStorage.mjs";
import { useAuth } from "../context/AuthContext";
import { useTransactions } from "../context/TransactionContext";
import { DEFAULT_CATEGORIES } from "../lib/categoryConfig.mjs";
import { reportClientWarning } from "../lib/observability.client.js";
import { readBudgetTargets } from "../lib/budgetStorage.mjs";
import {
  buildTransactionCsv,
  createTransactionExplorerState,
  filterAndSortTransactions,
} from "../lib/transactionExplorer.mjs";

function uniqueOptions(values = []) {
  return [...new Set(values.filter(Boolean))].sort((left, right) =>
    String(left).localeCompare(String(right), "en", { sensitivity: "base" })
  );
}

export default function TransactionTable({ transactions = [] }) {
  const { user } = useAuth();
  const { setTransactions } = useTransactions();
  const [displayTransactions, setDisplayTransactions] = useState(transactions);
  const [syncNotice, setSyncNotice] = useState("");
  const [explorer, setExplorer] = useState(createTransactionExplorerState());
  const deferredSearch = useDeferredValue(explorer.search);

  useEffect(() => {
    setDisplayTransactions(transactions);
  }, [transactions]);

  const bankOptions = useMemo(
    () => uniqueOptions(displayTransactions.map((transaction) => transaction.bank)),
    [displayTransactions]
  );
  const categoryOptions = useMemo(
    () =>
      uniqueOptions([
        ...DEFAULT_CATEGORIES,
        ...displayTransactions.map((transaction) => transaction.category),
      ]),
    [displayTransactions]
  );
  const explorerTransactions = useMemo(
    () =>
      filterAndSortTransactions(displayTransactions, {
        ...explorer,
        search: deferredSearch,
      }),
    [deferredSearch, displayTransactions, explorer]
  );
  const visibleNetAmount = useMemo(
    () =>
      explorerTransactions.reduce((total, transaction) => {
        const direction = transaction.type === "Debit" ? -1 : 1;
        return total + direction * Number(transaction.amount || 0);
      }, 0),
    [explorerTransactions]
  );

  const updateCategory = async (id, category) => {
    const existing = readCategoryOverrides(user?.id);

    existing[id] = category;

    setDisplayTransactions((current) =>
      current.map((transaction) =>
        transaction.id === id
          ? {
              ...transaction,
              category,
            }
          : transaction
      )
    );
    setTransactions((current) =>
      current.map((transaction) =>
        transaction.id === id
          ? {
              ...transaction,
              category,
            }
          : transaction
      )
    );
    writeCategoryOverrides(user?.id, existing);
    setSyncNotice("");

    try {
      await saveCloudUserData({
        categoryOverrides: existing,
        budgetTargets: readBudgetTargets(user?.id),
      });
      setSyncNotice("Category synced to your account.");
    } catch (error) {
      reportClientWarning({
        event: "transactions.category_sync_failed",
        message: "Cloud sync write failed while updating a transaction category.",
        error,
        context: { userId: user?.id || null, transactionId: id },
      });
      setSyncNotice("Category saved on this device. Cloud sync is unavailable right now.");
    }
  };

  const clearExplorerFilters = () => {
    setExplorer(createTransactionExplorerState());
  };

  const exportCurrentView = () => {
    if (!explorerTransactions.length || typeof window === "undefined") {
      return;
    }

    const csv = buildTransactionCsv(explorerTransactions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `fintrak-transactions-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <section className="mt-8 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-34px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/70">
      <div className="border-b border-slate-200/80 px-5 py-5 dark:border-slate-800/80 md:px-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Transactions
            </p>
            <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              Transaction explorer
            </h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {explorerTransactions.length} of {displayTransactions.length} entries visible
          </p>
        </div>
        {syncNotice ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            {syncNotice}
          </p>
        ) : null}

        <div className="mt-5 rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800/80 dark:bg-slate-900/50">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="transaction-explorer-search"
                  name="transactionExplorerSearch"
                  type="search"
                  value={explorer.search}
                  onChange={(e) =>
                    setExplorer((current) => ({
                      ...current,
                      search: e.target.value,
                    }))
                  }
                  placeholder="Search bank, VPA, category, type, amount..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={clearExplorerFilters}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-950 dark:hover:text-white"
                >
                  <X size={15} />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={exportCurrentView}
                  disabled={!explorerTransactions.length}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                >
                  <Download size={15} />
                  Export CSV
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  <SlidersHorizontal size={13} />
                  Bank
                </span>
                <select
                  id="transaction-explorer-bank"
                  name="transactionExplorerBank"
                  value={explorer.bank}
                  onChange={(e) =>
                    setExplorer((current) => ({
                      ...current,
                      bank: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                >
                  <option value="all">All banks</option>
                  {bankOptions.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Category
                </span>
                <select
                  id="transaction-explorer-category"
                  name="transactionExplorerCategory"
                  value={explorer.category}
                  onChange={(e) =>
                    setExplorer((current) => ({
                      ...current,
                      category: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                >
                  <option value="all">All categories</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Type
                </span>
                <select
                  id="transaction-explorer-type"
                  name="transactionExplorerType"
                  value={explorer.type}
                  onChange={(e) =>
                    setExplorer((current) => ({
                      ...current,
                      type: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                >
                  <option value="all">All types</option>
                  <option value="Debit">Debit</option>
                  <option value="Credit">Credit</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Sort
                </span>
                <select
                  id="transaction-explorer-sort"
                  name="transactionExplorerSort"
                  value={explorer.sort}
                  onChange={(e) =>
                    setExplorer((current) => ({
                      ...current,
                      sort: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                >
                  <option value="date-desc">Newest first</option>
                  <option value="date-asc">Oldest first</option>
                  <option value="amount-desc">Amount high to low</option>
                  <option value="amount-asc">Amount low to high</option>
                  <option value="bank-asc">Bank A to Z</option>
                  <option value="bank-desc">Bank Z to A</option>
                  <option value="category-asc">Category A to Z</option>
                  <option value="category-desc">Category Z to A</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/90 px-4 py-3 text-sm text-slate-600 dark:bg-slate-950/70 dark:text-slate-300">
              <p>
                Current view net amount:{" "}
                <span
                  className={
                    visibleNetAmount < 0 ? "font-semibold text-rose-500" : "font-semibold text-emerald-500"
                  }
                >
                  {visibleNetAmount < 0 ? "-" : "+"}₹{Math.abs(visibleNetAmount).toFixed(2)}
                </span>
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Export downloads exactly the rows visible after search, filters, and sorting.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
        {explorerTransactions.map((t) => (
          <div key={t.id} className="space-y-4 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-800 dark:text-slate-100">
                  {t.bank}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">
                  {t.dateLabel}
                </p>
              </div>
              <p
                className={`rounded-full px-3 py-1 text-sm font-bold ${
                  t.type === "Debit" ? "text-rose-500" : "text-emerald-500"
                } ${
                  t.type === "Debit"
                    ? "bg-rose-50 dark:bg-rose-950/20"
                    : "bg-emerald-50 dark:bg-emerald-950/20"
                }`}
              >
                {t.type === "Debit" ? "-" : "+"} ₹{t.amount}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <select
                id={`transaction-category-mobile-${t.id}`}
                name={`category-${t.id}`}
                value={t.category}
                onChange={(e) => updateCategory(t.id, e.target.value)}
                className="max-w-[52%] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                {DEFAULT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <p className="truncate rounded-xl bg-slate-100 px-3 py-2 text-right font-mono text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                {t.vpa}
              </p>
            </div>
          </div>
        ))}
        {!explorerTransactions.length ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No transactions match the current explorer filters.
          </div>
        ) : null}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/80 text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
            <tr>
              <th className="p-6 text-xs uppercase">Bank</th>
              <th className="p-6 text-xs uppercase">Date</th>
              <th className="p-6 text-xs uppercase">Category</th>
              <th className="p-6 text-xs uppercase">VPA</th>
              <th className="p-6 text-xs uppercase text-right">Amount</th>
            </tr>
          </thead>

          <tbody>
            {explorerTransactions.map((t) => (
              <tr
                key={t.id}
                className="border-t border-slate-200/70 transition hover:bg-slate-50/80 dark:border-slate-800/80 dark:hover:bg-slate-900/40"
              >
                <td className="p-6 font-semibold text-slate-800 dark:text-slate-100">
                  {t.bank}
                </td>
                <td className="p-6 text-slate-500 dark:text-slate-400">
                  {t.dateLabel}
                </td>
                <td className="p-6">
                  <select
                    id={`transaction-category-desktop-${t.id}`}
                    name={`category-${t.id}`}
                    value={t.category}
                    onChange={(e) => updateCategory(t.id, e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  >
                    {DEFAULT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="max-w-xs truncate p-6 font-mono text-slate-500 dark:text-slate-400">
                  {t.vpa}
                </td>

                <td
                  className={`p-6 text-right font-bold ${
                    t.type === "Debit" ? "text-rose-500" : "text-emerald-500"
                  }`}
                >
                  {t.type === "Debit" ? "-" : "+"} ₹{t.amount}
                </td>
              </tr>
            ))}
            {!explorerTransactions.length ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-10 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  No transactions match the current explorer filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
