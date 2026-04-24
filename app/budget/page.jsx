"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PiggyBank, Target, TrendingDown } from "lucide-react";
import Layout from "../components/Layout";
import { useTransactions } from "../context/TransactionContext";
import { useAuth } from "../context/AuthContext";
import { fetchCloudUserData, saveCloudUserData } from "../lib/userDataClient";
import { DEFAULT_CATEGORIES } from "../lib/categoryConfig.mjs";
import { reportClientWarning } from "../lib/observability.client.js";
import {
  readBudgetTargets,
  writeBudgetTargets,
} from "../lib/budgetStorage.mjs";
import { readCategoryOverrides } from "../lib/categoryOverridesStorage.mjs";

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
}

function sanitizeBudgetValue(value) {
  const normalized = String(value || "").replace(/[^\d.]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

export default function BudgetPage() {
  const { filteredTransactions } = useTransactions();
  const { user } = useAuth();
  const [budgets, setBudgets] = useState({});
  const [savedBudgets, setSavedBudgets] = useState({});
  const [statusMessage, setStatusMessage] = useState("Budgets sync automatically.");
  const [cloudSyncAvailable, setCloudSyncAvailable] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    async function loadBudgets() {
      const localBudgets = readBudgetTargets(user.id);

      if (!cancelled) {
        setBudgets(localBudgets);
        setSavedBudgets(localBudgets);
      }

      try {
        const cloudData = await fetchCloudUserData();
        const nextBudgets =
          cloudData?.budgetTargets && typeof cloudData.budgetTargets === "object"
            ? cloudData.budgetTargets
            : localBudgets;

        writeBudgetTargets(user.id, nextBudgets);

        if (!cancelled) {
          setBudgets(nextBudgets);
          setSavedBudgets(nextBudgets);
          setCloudSyncAvailable(Boolean(cloudData?.cloudSyncAvailable));
          setStatusMessage(
            cloudData?.cloudSyncAvailable
              ? "Budgets sync automatically to your account."
              : "Budgets are saving on this device."
          );
          setIsLoaded(true);
        }
      } catch (error) {
        reportClientWarning({
          event: "budget.load_failed",
          message: "Failed to load budgets from cloud sync.",
          error,
          context: { userId: user?.id || null },
        });
        if (!cancelled) {
          setStatusMessage("Budgets are saving on this device.");
          setIsLoaded(true);
        }
      }
    }

    loadBudgets();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const spendingByCategory = useMemo(() => {
    const totals = Object.fromEntries(DEFAULT_CATEGORIES.map((category) => [category, 0]));

    filteredTransactions.forEach((transaction) => {
      if (transaction.type !== "Debit") return;
      const category = DEFAULT_CATEGORIES.includes(transaction.category)
        ? transaction.category
        : "Other";
      totals[category] += transaction.amount;
    });

    return totals;
  }, [filteredTransactions]);

  const rows = DEFAULT_CATEGORIES.map((category) => {
    const budget = Number(budgets[category] || 0);
    const spent = Number(spendingByCategory[category] || 0);
    const remaining = budget - spent;
    const progress = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

    return {
      category,
      budget,
      spent,
      remaining,
      progress,
      overBudget: budget > 0 && spent > budget,
    };
  });

  const totalBudget = rows.reduce((sum, row) => sum + row.budget, 0);
  const totalSpent = rows.reduce((sum, row) => sum + row.spent, 0);
  const hasChanges =
    JSON.stringify(
      Object.fromEntries(
        Object.entries(budgets).filter(([, value]) => Number(value) > 0)
      )
    ) !==
    JSON.stringify(
      Object.fromEntries(
        Object.entries(savedBudgets).filter(([, value]) => Number(value) > 0)
      )
    );

  const updateBudget = (category, value) => {
    const nextBudgets = {
      ...budgets,
      [category]: sanitizeBudgetValue(value),
    };
    setBudgets(nextBudgets);
    if (user?.id) {
      writeBudgetTargets(user.id, nextBudgets);
    }
    setStatusMessage("Syncing budgets...");
  };

  useEffect(() => {
    if (!user?.id || !isLoaded || !hasChanges) {
      return undefined;
    }

    const sanitizedBudgets = Object.fromEntries(
      Object.entries(budgets)
        .map(([category, value]) => [category, sanitizeBudgetValue(value)])
        .filter(([, value]) => value > 0)
    );

    saveTimeoutRef.current = setTimeout(async () => {
      writeBudgetTargets(user.id, sanitizedBudgets);

      try {
        const result = await saveCloudUserData({
          categoryOverrides: readCategoryOverrides(user.id),
          budgetTargets: sanitizedBudgets,
        });
        setBudgets(sanitizedBudgets);
        setSavedBudgets(sanitizedBudgets);
        setCloudSyncAvailable(Boolean(result?.cloudSyncAvailable));
        setStatusMessage(
          result?.cloudSyncAvailable
            ? "Budgets synced to Supabase automatically."
            : "Budgets saved on this device."
        );
      } catch (error) {
        reportClientWarning({
          event: "budget.save_failed",
          message: "Failed to save budgets to cloud sync.",
          error,
          context: { userId: user?.id || null },
        });
        setCloudSyncAvailable(false);
        setStatusMessage("Budget sync failed. Your latest changes are still stored on this device.");
      }
    }, 700);

    return () => {
      clearTimeout(saveTimeoutRef.current);
    };
  }, [budgets, cloudSyncAvailable, hasChanges, isLoaded, user?.id]);

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">
                Budget Tracking
              </p>
              <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
                Plan category budgets and compare them with your spending
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                Set your category budgets here. The numbers below compare your saved budget targets
                with the spending shown by the current date filter.
              </p>
            </div>
          </div>

          {statusMessage ? (
            <p className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-950/20 dark:text-blue-300">
              {statusMessage}
            </p>
          ) : null}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            icon={Target}
            title="Total Budget"
            value={formatCurrency(totalBudget)}
            tone="blue"
          />
          <SummaryCard
            icon={TrendingDown}
            title="Spent in Filter"
            value={formatCurrency(totalSpent)}
            tone="rose"
          />
          <SummaryCard
            icon={PiggyBank}
            title="Remaining"
            value={formatCurrency(totalBudget - totalSpent)}
            tone={totalBudget - totalSpent < 0 ? "amber" : "emerald"}
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-5">
            {rows.map((row) => (
              <div
                key={row.category}
                className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/40"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {row.category}
                      </h2>
                      {row.overBudget ? (
                        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                          Over budget
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Spent {formatCurrency(row.spent)} of {formatCurrency(row.budget)}
                    </p>
                  </div>

                  <label className="flex min-w-[220px] flex-col gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                    Set budget amount
                    <input
                      id={`budget-${row.category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                      name={`budget-${row.category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                      type="number"
                      min="0"
                      step="1"
                      value={row.budget || ""}
                      onChange={(event) => updateBudget(row.category, event.target.value)}
                      placeholder="0"
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all ${
                      row.overBudget
                        ? "bg-rose-500"
                        : row.progress >= 85
                          ? "bg-amber-500"
                          : "bg-blue-500"
                    }`}
                    style={{ width: `${Math.max(row.progress, row.spent > 0 ? 6 : 0)}%` }}
                  />
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <Metric label="Budget" value={formatCurrency(row.budget)} />
                  <Metric label="Spent" value={formatCurrency(row.spent)} />
                  <Metric
                    label={row.remaining >= 0 ? "Remaining" : "Overspent"}
                    value={formatCurrency(Math.abs(row.remaining))}
                    tone={row.remaining >= 0 ? "default" : "danger"}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}

function SummaryCard({ icon: Icon, title, value, tone = "blue" }) {
  const toneClasses = {
    blue: "from-blue-500 to-cyan-500",
    rose: "from-rose-500 to-pink-500",
    emerald: "from-emerald-500 to-teal-500",
    amber: "from-amber-500 to-orange-500",
  };

  return (
    <div className={`rounded-3xl bg-linear-to-br ${toneClasses[tone]} p-6 text-white shadow-xl`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/80">{title}</p>
          <p className="mt-3 text-3xl font-bold">{value}</p>
        </div>
        <div className="rounded-2xl bg-white/15 p-3">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = "default" }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900/70">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className={`mt-2 text-base font-semibold ${
          tone === "danger"
            ? "text-rose-600 dark:text-rose-300"
            : "text-slate-900 dark:text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
