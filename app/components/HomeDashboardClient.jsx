"use client";

import Link from "next/link";
import Layout from "./Layout";
import SummaryCards from "./SummaryCards";
import TransactionTable from "./TransactionTable";
import ExpenseChart from "./ExpenseChart";
import BankSummary from "./BankSummary";
import CategoryChart from "./CategoryChart";
import { useAuth } from "../context/AuthContext";
import { useTransactions } from "../context/TransactionContext";

export default function HomeDashboardClient() {
  const { authenticated, connectGmail, loading: authLoading } = useAuth();
  const { filteredTransactions, loading, syncError, syncWarning } =
    useTransactions();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6 text-center text-slate-600 dark:bg-[#020617] dark:text-slate-300">
        FinTrak is warming up...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6 dark:bg-[#020617]">
        <div className="max-w-md space-y-4 text-center text-slate-600 dark:text-slate-300">
          <p>Your FinTrak session is no longer available.</p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Go to homepage
            </Link>
            <Link
              href="/get-started?tab=login"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Sign in again
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      {loading ? (
        <div className="flex justify-center py-24">Syncing...</div>
      ) : syncError ? (
        <div className="space-y-4 py-24 text-center">
          <p className="text-rose-500">{syncError}</p>
          <button
            onClick={() => connectGmail({ forceConsent: true })}
            className="rounded-xl bg-blue-600 px-6 py-4 font-semibold text-white shadow-lg transition-all hover:bg-blue-700 active:scale-95"
          >
            Reconnect Gmail
          </button>
        </div>
      ) : filteredTransactions.length > 0 ? (
        <>
          {syncWarning ? (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
              {syncWarning}
            </div>
          ) : null}

          <SummaryCards transactions={filteredTransactions} />
          <BankSummary transactions={filteredTransactions} />

          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <ExpenseChart transactions={filteredTransactions} />
            <CategoryChart transactions={filteredTransactions} />
          </div>

          <section id="transactions" className="scroll-mt-6">
            <TransactionTable transactions={filteredTransactions} />
          </section>
        </>
      ) : (
        <div className="py-24 text-center">No transactions found.</div>
      )}
    </Layout>
  );
}
