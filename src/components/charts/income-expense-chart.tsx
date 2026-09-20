"use client";

import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";

export type MonthlyPoint = { label: string; income: number; expense: number };

export function IncomeExpenseChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <filter id="neon-income" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="var(--chart-income)" floodOpacity="0.8" />
            <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="var(--chart-income)" floodOpacity="0.5" />
          </filter>
          <filter id="neon-expense" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="var(--chart-expense)" floodOpacity="0.8" />
            <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="var(--chart-expense)" floodOpacity="0.5" />
          </filter>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="var(--chart-axis)" />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={12}
          stroke="var(--chart-axis)"
          width={64}
          tickFormatter={(v: number) => formatCurrency(v, { compact: true }).replace("Rp ", "")}
        />
        <Tooltip
          formatter={(value: number, name) => [formatCurrency(value), name]}
          contentStyle={{ borderRadius: 8, border: "1px solid var(--chart-grid)", fontSize: 12, backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Line 
          type="monotone" 
          dataKey="income" 
          name="Pemasukan" 
          stroke="var(--chart-income)" 
          strokeWidth={3} 
          filter="url(#neon-income)"
          dot={{ className: "recharts-dot", strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }} 
        />
        <Line 
          type="monotone" 
          dataKey="expense" 
          name="Pengeluaran" 
          stroke="var(--chart-expense)" 
          strokeWidth={3}
          filter="url(#neon-expense)"
          dot={{ className: "recharts-dot", strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }} 
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
