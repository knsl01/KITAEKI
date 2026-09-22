"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";

export type MemberCashflowPoint = { name: string; income: number; expense: number };

export function MemberCashflowCompareChart({ data }: { data: MemberCashflowPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="var(--chart-axis)" />
        <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--chart-axis)" width={64} tickFormatter={(v: number) => formatCurrency(v, { compact: true }).replace("Rp ", "")} />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))" }}
          formatter={(value: number, key: string) => [formatCurrency(value), key === "income" ? "Pemasukan" : "Pengeluaran"]}
          contentStyle={{ borderRadius: 8, border: "1px solid var(--chart-grid)", fontSize: 12, backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
        />
        <Legend />
        <Bar dataKey="income" name="Pemasukan" fill="hsl(var(--positive))" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expense" name="Pengeluaran" fill="hsl(var(--negative))" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
