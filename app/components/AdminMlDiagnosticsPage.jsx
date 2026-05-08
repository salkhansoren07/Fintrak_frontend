"use client";

import Link from "next/link";
import { RefreshCcw } from "lucide-react";
import { useState, useTransition } from "react";
import MlSyncDebugCard from "./MlSyncDebugCard";
import { reportClientWarning } from "../lib/observability.client.js";
import { useAuth } from "../context/AuthContext";
import { useTransactions } from "../context/TransactionContext";

function formatDateTime(value) {
  if (!value) {
    return "Unknown";
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HistoryTable({ entries = [] }) {
  if (!entries.length) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        No previous ML syncs have been recorded on this device yet.
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Recent ML sync history
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Stored locally for this admin session so you can compare the last few syncs.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-950/70 dark:text-slate-400">
            <tr>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.2em]">Recorded</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.2em]">Mode</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.2em]">Candidates</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.2em]">Upgrades</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.2em]">Parsed</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.2em]">Predicted categories</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => {
              const counts = Object.entries(entry.mlPredictedCategoryCounts || {});

              return (
                <tr
                  key={`${entry.recordedAt || "unknown"}-${index}`}
                  className="border-t border-slate-200/70 dark:border-slate-800/80"
                >
                  <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">
                    {formatDateTime(entry.recordedAt)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                    {entry.cached ? "Cached" : "Live"}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                    {entry.mlCandidatesConsidered || 0}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                    {entry.mlPredictionsApplied || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                    {entry.parsedTransactions || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                    {counts.length
                      ? counts.map(([category, count]) => `${category}: ${count}`).join(", ")
                      : "None"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function AdminMlDiagnosticsPage() {
  const { loading: authLoading, user } = useAuth();
  const { loading, syncMeta, syncHistory, refreshTransactions } = useTransactions();
  const [isRefreshing, startTransition] = useTransition();
  const [refreshError, setRefreshError] = useState("");

  if (authLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        Checking admin access...
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          ML Diagnostics
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
          This panel is only available to FinTrak admins.
        </p>
      </section>
    );
  }

  const handleRefresh = () => {
    startTransition(async () => {
      setRefreshError("");

      try {
        await refreshTransactions({ forceRefresh: true });
      } catch (error) {
        reportClientWarning({
          event: "admin.ml.refresh_failed",
          message: "Manual ML telemetry refresh failed.",
          error,
          context: { userId: user?.id || null },
        });
        setRefreshError(
          error instanceof Error
            ? error.message
            : "Could not refresh ML telemetry right now."
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          ML Diagnostics
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          Review the most recent Gmail sync telemetry for the ML category upgrade
          path. This view shows only the latest sync metadata available in your
          current dashboard session.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RefreshCcw size={16} className={isRefreshing ? "animate-spin" : ""} />
            {isRefreshing ? "Refreshing..." : "Refresh telemetry"}
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Back to dashboard
          </Link>
          <Link
            href="/admin/testimonials"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Open testimonial admin
          </Link>
        </div>
        {refreshError ? (
          <p className="mt-4 rounded-2xl bg-rose-100 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
            {refreshError}
          </p>
        ) : null}
      </section>

      {loading && !syncMeta ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Waiting for transaction sync telemetry...
        </div>
      ) : syncMeta ? (
        <MlSyncDebugCard meta={syncMeta} />
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          No ML sync telemetry is available yet. Open the dashboard and let a Gmail
          sync complete first, then return here.
        </div>
      )}

      <HistoryTable entries={syncHistory} />
    </div>
  );
}
