"use client";

import Layout from "../components/Layout";
import AiInsightsPanel from "../components/AiInsightsPanel";
import { useTransactions } from "../context/TransactionContext";

export default function InsightsPage() {
  const { filteredTransactions } = useTransactions();

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">
            FinTrak Insights
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
            AI summaries for the current transaction filter
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            Review a focused summary of your filtered transactions, including
            spending themes, larger outgoing payments, and a few practical next
            checks.
          </p>
        </section>

        <AiInsightsPanel transactions={filteredTransactions} />
      </div>
    </Layout>
  );
}
