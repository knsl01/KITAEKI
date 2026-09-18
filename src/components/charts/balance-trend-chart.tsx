"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";

export function BalanceTrendChart({ data }: { data: { label: string; net: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="var(--chart-axis)" />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={12}
          width={64}
          stroke="var(--chart-axis)"
          tickFormatter={(v: number) => formatCurrency(v, { compact: true }).replace("Rp ", "")}
        />
        <Tooltip
          formatter={(value: number) => [formatCurrency(value), "Selisih"]}
          contentStyle={{ borderRadius: 8, border: "1px solid var(--chart-grid)", fontSize: 12 }}
        />
        <Area type="monotone" dataKey="net" stroke="var(--chart-income)" fill="var(--chart-income)" fillOpacity={0.12} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
