"use client";

import {
  ArrowUpRight,
  PiggyBank,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchCloudUserData } from "../lib/userDataClient";
import { readBudgetTargets, writeBudgetTargets } from "../lib/budgetStorage.mjs";
import { reportClientWarning } from "../lib/observability.client.js";

export default function SummaryCards({ transactions = [] }) {
  const { user } = useAuth();
  const [cloudBudgetTargets, setCloudBudgetTargets] = useState({});

  const debit = transactions
    .filter((t) => t.type === "Debit")
    .reduce((a, b) => a + b.amount, 0);

  const credit = transactions
    .filter((t) => t.type === "Credit")
    .reduce((a, b) => a + b.amount, 0);

  const localBudgetTargets = user?.id ? readBudgetTargets(user.id) : {};

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let cancelled = false;

    async function loadBudgetTargets() {
      const fallbackBudgets = readBudgetTargets(user.id);

      try {
        const cloudData = await fetchCloudUserData();
        const nextBudgets =
          cloudData?.budgetTargets && typeof cloudData.budgetTargets === "object"
            ? cloudData.budgetTargets
            : fallbackBudgets;

        writeBudgetTargets(user.id, nextBudgets);

        if (!cancelled) {
          setCloudBudgetTargets(nextBudgets);
        }
      } catch (error) {
        reportClientWarning({
          event: "summary_cards.budget_load_failed",
          message: "Failed to load budget targets for summary cards.",
          error,
          context: { userId: user?.id || null },
        });
      }
    }

    loadBudgetTargets();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const budgetTargets =
    Object.keys(cloudBudgetTargets).length > 0
      ? cloudBudgetTargets
      : localBudgetTargets;

  const totalBudget = useMemo(
    () =>
      Object.values(budgetTargets).reduce(
        (sum, value) => sum + Number(value || 0),
        0
      ),
    [budgetTargets]
  );
  const budgetRemaining = totalBudget - debit;

  return (
    <div className="mb-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <Card
        title="Total Expenses"
        value={debit}
        subtitle="Debit transactions in the current view"
        icon={<TrendingDown />}
        red
      />
      <Card
        title="Total Income"
        value={credit}
        subtitle="Credits recognized from synced messages"
        icon={<TrendingUp />}
      />
      <Card
        title="Budget Remaining"
        value={budgetRemaining}
        subtitle="Combined budget targets minus current spend"
        icon={<PiggyBank />}
        amber={budgetRemaining < 0}
        blue={budgetRemaining >= 0}
      />
    </div>
  );
}

function Card({ title, value, subtitle, icon, red, amber, blue }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[32px] p-6 text-white shadow-[0_24px_70px_-36px_rgba(15,23,42,0.55)] ${
        red
          ? "bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22),_transparent_35%),linear-gradient(140deg,_#fb7185_0%,_#f43f5e_55%,_#be123c_100%)]"
          : amber
            ? "bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22),_transparent_35%),linear-gradient(140deg,_#f59e0b_0%,_#f97316_55%,_#c2410c_100%)]"
            : blue
              ? "bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22),_transparent_35%),linear-gradient(140deg,_#3b82f6_0%,_#06b6d4_55%,_#0f766e_100%)]"
          : "bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22),_transparent_35%),linear-gradient(140deg,_#10b981_0%,_#14b8a6_55%,_#0f766e_100%)]"
      }`}
    >
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
            {title}
          </p>
          <p className="mt-3 text-3xl font-bold md:text-4xl">
            ₹ {Number(value || 0).toLocaleString("en-IN")}
          </p>
          <p className="mt-3 max-w-xs text-sm text-white/80">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-white/15 p-3 sm:p-4">{icon}</div>
      </div>
      <div className="relative mt-6 flex items-center gap-2 text-sm font-medium text-white/80">
        <ArrowUpRight size={16} />
        Live totals for the active filter
      </div>
    </div>
  );
}
