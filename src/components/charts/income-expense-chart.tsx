"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";

export type MonthlyPoint = { label: string; income: number; expense: number };

export function IncomeExpenseChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={6}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(40 8% 89%)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="hsl(150 6% 45%)" />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={12}
          stroke="hsl(150 6% 45%)"
          width={64}
          tickFormatter={(v: number) => formatCurrency(v, { compact: true }).replace("Rp ", "")}
        />
        <Tooltip
          cursor={{ fill: "hsl(40 10% 94%)" }}
          formatter={(value: number, name) => [formatCurrency(value), name]}
          contentStyle={{ borderRadius: 8, border: "1px solid hsl(40 8% 89%)", fontSize: 12 }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="income" name="Pemasukan" fill="#3F6B4F" radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Bar dataKey="expense" name="Pengeluaran" fill="#C2596A" radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
