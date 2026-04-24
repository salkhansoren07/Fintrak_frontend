"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function CategoryChart({ transactions = [] }) {
  const dataMap = {};

  transactions.forEach(t => {
    if (t.type !== "Debit") return;
    dataMap[t.category] = (dataMap[t.category] || 0) + t.amount;
  });

  const data = Object.entries(dataMap)
    .map(([name, value]) => ({
      name,
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <div className="rounded-[32px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_60px_-34px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/70 md:p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Categories
          </p>
          <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            Spending by category
          </h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Top debit categories in the current view
        </p>
      </div>

      {data.length === 0 ? (
        <div className="flex h-[240px] items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-700">
          No category spending yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={270}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 12, bottom: 4 }}
            barSize={12}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              stroke="rgba(148,163,184,0.18)"
            />
            <XAxis
              type="number"
              tickFormatter={(value) => formatCurrency(value)}
              tick={{ fill: "#94A3B8", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={88}
              tick={{ fill: "#94A3B8", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(59,130,246,0.08)" }}
              formatter={(value) => [formatCurrency(value), "Spent"]}
              contentStyle={{
                borderRadius: "16px",
                border: "1px solid rgba(148,163,184,0.2)",
                backgroundColor: "rgba(15,23,42,0.95)",
                color: "#E2E8F0",
              }}
              labelStyle={{ color: "#F8FAFC" }}
            />
            <Bar
              dataKey="value"
              fill="#3B82F6"
              radius={[999, 999, 999, 999]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
