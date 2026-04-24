"use client";

import Layout from "../../components/Layout";
import { useTransactions } from "../../context/TransactionContext";
import { useParams } from "next/navigation";

export default function IndividualDetail() {
  const { transactions } = useTransactions();
  const params = useParams();

  const vpa = decodeURIComponent(params.vpa);

  const personTxns = transactions.filter(t => t.vpa === vpa);

  const debit = personTxns
    .filter(t => t.type === "Debit")
    .reduce((a, b) => a + b.amount, 0);

  const credit = personTxns
    .filter(t => t.type === "Credit")
    .reduce((a, b) => a + b.amount, 0);

  const net = credit - debit;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">

        <h2 className="text-xl font-semibold mb-4">{vpa}</h2>

        <div className="flex gap-6 mb-6">

          <div className="bg-rose-500/10 text-rose-500 px-5 py-3 rounded-xl">
            Debit: ₹ {debit}
          </div>

          <div className="bg-emerald-500/10 text-emerald-500 px-5 py-3 rounded-xl">
            Credit: ₹ {credit}
          </div>

          <div className="bg-blue-500/10 text-blue-500 px-5 py-3 rounded-xl">
            Net: ₹ {net}
          </div>

        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow overflow-hidden">

          <table className="w-full">
            <thead className="bg-gray-50 text-slate-300 dark:bg-gray-800">
              <tr>
                <th className="p-4 text-xs uppercase">Date</th>
                <th className="p-4 text-xs uppercase">Bank</th>
                <th className="p-4 text-xs uppercase text-right">Amount</th>
              </tr>
            </thead>

            <tbody>
              {personTxns.map(t => (
                <tr key={t.id} className="border-t">
                  <td className="p-4 text-slate-400">{t.dateLabel}</td>
                  <td className="p-4 text-slate-300">{t.bank}</td>

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
