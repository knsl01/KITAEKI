"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency, percent } from "@/lib/format";

export type CategorySlice = { name: string; value: number; color: string };

export function CategoryDonut({ data }: { data: CategorySlice[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-[200px] w-[200px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={2}>
              {data.map((slice) => (
                <Cell key={slice.name} fill={slice.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name) => [formatCurrency(value), name]}
              contentStyle={{ borderRadius: 8, border: "1px solid var(--chart-grid)", fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="tabular text-sm font-medium">{formatCurrency(total, { compact: true })}</span>
        </div>
      </div>

      <ul className="w-full space-y-2.5">
        {data.map((slice) => (
          <li key={slice.name} className="group flex items-center gap-3 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full transition-transform duration-200 group-hover:scale-150"
              style={{ backgroundColor: slice.color }}
            />
            <span className="flex-1 truncate">{slice.name}</span>
            <span className="tabular text-muted-foreground">{percent(slice.value, total)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
