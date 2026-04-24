"use client";

import { BrainCircuit, LoaderCircle, Sparkles, TriangleAlert } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { fetchAiInsights } from "../lib/aiInsightsClient.js";
import { reportClientWarning } from "../lib/observability.client.js";

function EmptyState({ message }) {
  return (
    <section className="mb-8 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/80 p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/60">
      <div className="flex items-center gap-3 text-slate-900 dark:text-slate-100">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          <BrainCircuit size={20} />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Smart Insights
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{message}</p>
        </div>
      </div>
    </section>
  );
}

export default function AiInsightsPanel({ transactions = [] }) {
  const deferredTransactions = useDeferredValue(transactions);
  const requestTransactions = useMemo(
    () =>
      [...deferredTransactions]
        .sort((left, right) => right.timestamp - left.timestamp)
        .slice(0, 75),
    [deferredTransactions]
  );
  const [state, setState] = useState({
    loading: false,
    error: "",
    payload: null,
    retryKey: 0,
  });
  const forceRefresh = state.retryKey > 0;

  useEffect(() => {
    if (requestTransactions.length === 0) {
      setState((current) => ({
        ...current,
        loading: false,
        error: "",
        payload: null,
      }));
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function loadInsights() {
      setState((current) => ({
        ...current,
        loading: true,
        error: "",
      }));

      try {
        const payload = await fetchAiInsights(
          requestTransactions,
          controller.signal,
          { forceRefresh }
        );

        if (cancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          loading: false,
          error: "",
          payload,
        }));
      } catch (error) {
        if (cancelled || error?.name === "AbortError") {
          return;
        }

        reportClientWarning({
          event: "ai.insights.fetch_failed",
          message: "Failed to load dashboard insights.",
          error,
          context: {
            transactionCount: requestTransactions.length,
          },
        });

        setState((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : "Failed to load insights",
        }));
      }
    }

    loadInsights();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [forceRefresh, requestTransactions, state.retryKey]);

  if (requestTransactions.length === 0) {
    return (
      <EmptyState message="Insights will appear once the current filter has transaction activity." />
    );
  }

  const { payload } = state;
  const badgeLabel =
    payload?.source === "groq"
      ? "Groq AI"
      : payload?.source === "fallback"
        ? "Smart Summary"
        : "Insights";

  return (
    <section className="mb-10 overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(241,245,249,0.84))] p-6 shadow-[0_28px_90px_-48px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.96),rgba(2,6,23,0.88))]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                FinTrak Insights
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                Fast read on the current transaction view
              </h2>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200">
              {badgeLabel}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Based on the latest {requestTransactions.length} transactions in this filter
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setState((current) => ({
              ...current,
              retryKey: current.retryKey + 1,
            }))
          }
          disabled={state.loading}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          {state.loading ? (
            <>
              <LoaderCircle className="mr-2 animate-spin" size={16} />
              Refreshing...
            </>
          ) : (
            "Refresh insights"
          )}
        </button>
      </div>

      {state.loading && !payload ? (
        <div className="mt-8 flex items-center gap-3 rounded-[24px] border border-dashed border-slate-300/80 bg-white/70 px-4 py-5 text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
          <LoaderCircle className="animate-spin" size={18} />
          FinTrak is generating insights for this filtered view.
        </div>
      ) : null}

      {!state.loading && state.error && !payload ? (
        <div className="mt-8 flex items-start gap-3 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-200">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm">{state.error}</p>
        </div>
      ) : null}

      {payload ? (
        <>
          <div className="mt-8 rounded-[28px] bg-slate-950 px-5 py-5 text-slate-50 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.7)] dark:bg-slate-900">
            <p className="text-sm uppercase tracking-[0.22em] text-slate-300">
              Overview
            </p>
            <p className="mt-3 text-lg leading-8 text-slate-100">{payload.overview}</p>
          </div>

          {payload.warning ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
              {payload.warning}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {payload.insights.map((item) => (
              <article
                key={`${item.title}:${item.detail}`}
                className="rounded-[26px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_16px_45px_-36px_rgba(15,23,42,0.6)] dark:border-slate-800 dark:bg-slate-950/50"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  {item.title}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">
                  {item.detail}
                </p>
              </article>
            ))}
          </div>

          {payload.actions?.length ? (
            <div className="mt-6 rounded-[28px] border border-blue-200/70 bg-blue-50/80 p-5 dark:border-blue-900/50 dark:bg-blue-950/20">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700 dark:text-blue-300">
                Suggested next checks
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {payload.actions.map((action) => (
                  <div
                    key={action}
                    className="rounded-2xl bg-white/90 px-4 py-4 text-sm leading-7 text-slate-700 shadow-sm dark:bg-slate-950/50 dark:text-slate-200"
                  >
                    {action}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
