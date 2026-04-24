"use client";

import {
  CartesianGrid,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
} from "recharts";

// Glowing active dot
const GlowDot = ({ cx, cy, stroke }) => {
  if (!cx || !cy) return null;

  return (
    <g>
      <circle cx={cx} cy={cy} r={10} fill={stroke} opacity={0.2} />
      <circle cx={cx} cy={cy} r={5} fill={stroke} />
    </g>
  );
};

export default function ExpenseChart({ transactions = [] }) {
  const map = {};

  transactions.forEach(t => {
    if (!map[t.dateLabel]) {
      map[t.dateLabel] = {
        date: t.dateLabel,
        expense: 0,
        income: 0,
      };
    }

    if (t.type === "Debit") map[t.dateLabel].expense += t.amount;
    if (t.type === "Credit") map[t.dateLabel].income += t.amount;
  });

  const data = Object.values(map);

  return (
    <div className="rounded-[32px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_60px_-34px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/70 md:p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Cash Flow
          </p>
          <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            Income vs expense over time
          </h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Debit area with income trend overlay
        </p>
      </div>

      <ResponsiveContainer width="100%" height={270}>
        <LineChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgba(148,163,184,0.14)"
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(15,23,42,0.96)",
              borderRadius: "16px",
              border: "1px solid rgba(148,163,184,0.18)",
            }}
          />

          <Area
            type="monotone"
            dataKey="expense"
            stroke="#EF4444"
            fill="#EF4444"
            fillOpacity={0.16}
          />

          <Line
            type="monotone"
            dataKey="income"
            stroke="#10B981"
            strokeWidth={3}
            dot={<GlowDot />}
            activeDot={<GlowDot />}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
