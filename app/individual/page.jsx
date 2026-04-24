"use client";
import Link from "next/link";
import Layout from "../components/Layout";
import { useTransactions } from "../context/TransactionContext";
import { useMemo, useState } from "react";

export default function IndividualPage() {
  const { transactions } = useTransactions();
  const [search, setSearch] = useState("");

  const grouped = useMemo(() => {
    const map = {};

    transactions.forEach(t => {
      if (!map[t.vpa]) {
        map[t.vpa] = {
          vpa: t.vpa,
          debit: 0,
          credit: 0,
          count: 0,
        };
      }

      if (t.type === "Debit") map[t.vpa].debit += t.amount;
      if (t.type === "Credit") map[t.vpa].credit += t.amount;

      map[t.vpa].count++;
    });

    return Object.values(map)
      .filter(p =>
        p.vpa.toLowerCase().includes(search.toLowerCase())
      )
      // sort by net expense (highest spender first)
      .sort(
        (a, b) =>
          (b.debit - b.credit) - (a.debit - a.credit)
      );
  }, [transactions, search]);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">

        <h2 className="text-2xl font-semibold mb-6 text-slate-300">
          Person Wise Payments
        </h2>

        <input
          id="individual-search"
          name="search"
          placeholder="Search VPA..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full mb-6 p-3 rounded-xl placeholder:text-slate-500 text-slate-400 bg-white dark:bg-gray-900 border outline-none"
        />

        <div className="space-y-4">
          {grouped.map(p => (
            <Link
              key={p.vpa}
              href={`/individual/${encodeURIComponent(p.vpa)}`}
              className="block bg-white dark:bg-gray-900 p-5 rounded-2xl shadow hover:scale-[1.01] transition"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-mono text-sm text-slate-400">
                    {p.vpa}
                  </p>
                  <p className="text-xs text-slate-500">
                    Transactions: {p.count}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-rose-500 font-bold">
                    - ₹ {p.debit.toLocaleString("en-IN")}
                  </p>
                  <p className="text-emerald-500 text-sm">
                    + ₹ {p.credit.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </Layout>
  );
}
