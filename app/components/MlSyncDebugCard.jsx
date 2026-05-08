"use client";

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50/90 px-4 py-3 dark:bg-slate-950/60">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

export default function MlSyncDebugCard({ meta }) {
  if (!meta) {
    return null;
  }

  const predictedCategoryCounts = Object.entries(meta.mlPredictedCategoryCounts || {});

  return (
    <section className="mb-6 rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_48px_-32px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/70">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Admin Debug
          </p>
          <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            ML category sync diagnostics
          </h3>
        </div>
        <span
          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
            meta.cached
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
          }`}
        >
          {meta.cached ? "Showing cached sync" : "Showing live sync"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Messages matched" value={meta.matchedMessages || 0} />
        <MetricCard label="Parsed transactions" value={meta.parsedTransactions || 0} />
        <MetricCard label="ML candidates" value={meta.mlCandidatesConsidered || 0} />
        <MetricCard label="ML upgrades" value={meta.mlPredictionsApplied || 0} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800/80">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            ML predicted categories
          </p>
          {predictedCategoryCounts.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {predictedCategoryCounts.map(([category, count]) => (
                <span
                  key={category}
                  className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                >
                  {category}: {count}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              No ML category upgrades were applied in this sync.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800/80">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Service health
          </p>
          <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <p>
              ML service:{" "}
              <span className="font-semibold">
                {meta.mlServiceAvailable ? "configured" : "not configured"}
              </span>
            </p>
            <p>
              Detail fetch failures:{" "}
              <span className="font-semibold">{meta.detailFailures || 0}</span>
            </p>
            <p>
              Gmail messages fetched:{" "}
              <span className="font-semibold">{meta.fetchedMessages || 0}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
