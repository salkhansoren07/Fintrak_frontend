"use client";

import Layout from "../../components/Layout";
import { useTransactions } from "../../context/TransactionContext";
import { useParams } from "next/navigation";

export default function BankDetail() {
  const { transactions } = useTransactions();
  const params = useParams();

  const bank = decodeURIComponent(params.bank);

  const bankTxns = transactions.filter(t => t.bank === bank);

  const debit = bankTxns
    .filter(t => t.type === "Debit")
    .reduce((a, b) => a + b.amount, 0);

  const credit = bankTxns
    .filter(t => t.type === "Credit")
    .reduce((a, b) => a + b.amount, 0);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">

        <h2 className="text-xl font-semibold mb-4">{bank} Transactions</h2>

        <div className="flex gap-6 mb-6">
          <div className="bg-rose-500/10 text-rose-500 px-5 py-3 rounded-xl">
            Debit: ₹ {debit}
          </div>

          <div className="bg-emerald-500/10 text-emerald-500 px-5 py-3 rounded-xl">
            Credit: ₹ {credit}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow overflow-hidden">

          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 text-slate-400">
              <tr>
                <th className="p-4 text-xs uppercase">Date</th>
                <th className="p-4 text-xs uppercase">VPA</th>
                <th className="p-4 text-xs uppercase text-right">Amount</th>
              </tr>
            </thead>

            <tbody>
              {bankTxns.map(t => (
                <tr key={t.id} className="border-t">
                  <td className="p-4 text-slate-400">{t.dateLabel}</td>

                  <td className="p-4 text-slate-300 font-mono truncate max-w-xs">
                    {t.vpa}
                  </td>

                  <td
                    className={`p-4 text-right font-bold ${
                      t.type === "Debit"
                        ? "text-rose-500"
                        : "text-emerald-500"
                    }`}
                  >
                    {t.type === "Debit" ? "-" : "+"} ₹{t.amount}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>

        </div>

      </div>
    </Layout>
  );
}
