"use client";

import Link from "next/link";

export default function BankSummary({ transactions = [] }) {
  const banks = transactions.reduce((acc, t) => {
    if (!acc[t.bank]) acc[t.bank] = { debit: 0, credit: 0 };

    if (t.type === "Debit") acc[t.bank].debit += t.amount;
    if (t.type === "Credit") acc[t.bank].credit += t.amount;

    return acc;
  }, {});

  const bankRows = Object.entries(banks)
    .map(([bank, data]) => ({
      bank,
      ...data,
      total: data.debit + data.credit,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <section className="mt-8 rounded-[32px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_60px_-34px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/70 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Bank Overview
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            Where your transaction flow is concentrated
          </h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ranked by total money movement in the current filter.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {bankRows.map((entry, index) => (
          <Link
            key={entry.bank}
            href={`/bank/${encodeURIComponent(entry.bank)}`}
            className="group rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] p-5 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:border-blue-200 dark:border-slate-800 dark:bg-[linear-gradient(180deg,_#0f172a_0%,_#081225_100%)] dark:hover:border-blue-900/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Bank {String(index + 1).padStart(2, "0")}
                </p>
                <h4 className="mt-2 break-words text-lg font-semibold text-slate-900 dark:text-white">
                  {entry.bank}
                </h4>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                ₹ {entry.total.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-rose-50 px-4 py-3 dark:bg-rose-950/20">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">
                  Debit
                </p>
                <p className="mt-2 text-base font-bold text-rose-600 dark:text-rose-300">
                  ₹ {entry.debit.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/20">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">
                  Credit
                </p>
                <p className="mt-2 text-base font-bold text-emerald-600 dark:text-emerald-300">
                  ₹ {entry.credit.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
