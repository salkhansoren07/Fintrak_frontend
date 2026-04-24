import {
  ArrowUpRight,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";

function MetricCard({ label, value, tone = "blue", icon: Icon }) {
  const toneClasses = {
    blue: "from-blue-500 to-cyan-500",
    emerald: "from-emerald-500 to-teal-500",
    rose: "from-rose-500 to-pink-500",
  };

  return (
    <div className={`rounded-[24px] bg-linear-to-br ${toneClasses[tone]} p-4 text-white shadow-lg`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">
            {label}
          </p>
          <p className="mt-3 text-2xl font-bold">{value}</p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15">
          <Icon size={18} />
        </span>
      </div>
    </div>
  );
}

export default function DashboardScreenshots() {
  const bars = [
    { label: "Food", value: "₹ 5.2k", width: "92%" },
    { label: "Bills", value: "₹ 3.7k", width: "68%" },
    { label: "Transfer", value: "₹ 2.9k", width: "52%" },
    { label: "Shopping", value: "₹ 1.6k", width: "32%" },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div className="absolute -left-6 top-10 h-32 w-32 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute -right-6 bottom-8 h-36 w-36 rounded-full bg-cyan-500/20 blur-3xl" />

      <div className="relative overflow-hidden rounded-[34px] border border-white/50 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_34%),linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(239,246,255,0.92)_100%)] p-4 shadow-[0_30px_90px_-40px_rgba(59,130,246,0.55)] backdrop-blur dark:border-slate-800/80 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_34%),linear-gradient(180deg,_rgba(15,23,42,0.96)_0%,_rgba(8,18,37,0.94)_100%)] sm:p-5">
        <div className="mb-4 flex items-center justify-between rounded-[24px] border border-slate-200/80 bg-white/85 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Dashboard Preview
            </p>
            <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
              FinTrak overview
            </h3>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
            Live style
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Expenses"
            value="₹ 18.4k"
            tone="rose"
            icon={TrendingDown}
          />
          <MetricCard
            label="Income"
            value="₹ 27.2k"
            tone="emerald"
            icon={TrendingUp}
          />
          <MetricCard
            label="Budget Left"
            value="₹ 9.8k"
            tone="blue"
            icon={PiggyBank}
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr,0.95fr]">
          <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Cash Flow
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  Income vs expense
                </p>
              </div>
              <ArrowUpRight size={16} className="text-slate-400" />
            </div>

            <div className="mt-5 flex h-[170px] items-end gap-3 rounded-[22px] bg-slate-50 px-4 pb-4 pt-8 dark:bg-slate-900/80">
              {[48, 70, 42, 86, 68, 96, 72].map((height, index) => (
                <div key={height} className="flex flex-1 items-end gap-1">
                  <div
                    className="w-1/2 rounded-full bg-rose-400/80"
                    style={{ height: `${height * 0.7}px` }}
                  />
                  <div
                    className="w-1/2 rounded-full bg-emerald-400/90"
                    style={{ height: `${height}px` }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Categories
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  Spending by category
                </p>
              </div>
              <WalletCards size={16} className="text-slate-400" />
            </div>

            <div className="mt-5 space-y-4">
              {bars.map((bar) => (
                <div key={bar.label}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {bar.label}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {bar.value}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-blue-500 to-cyan-400"
                      style={{ width: bar.width }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative -mt-16 ml-auto w-[230px] rounded-[28px] border border-white/70 bg-white/92 p-4 shadow-[0_22px_70px_-30px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/82 sm:w-[260px]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Mobile View
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
              Budget quick look
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            Auto-sync
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {[
            ["Food", "₹ 5,000", "78%"],
            ["Bills", "₹ 3,500", "61%"],
            ["Shopping", "₹ 2,000", "38%"],
          ].map(([label, value, width]) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-3 dark:border-slate-800 dark:bg-slate-900/70"
            >
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {label}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {value}
                </span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-linear-to-r from-emerald-500 to-cyan-400"
                  style={{ width }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
