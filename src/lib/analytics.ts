import type { Transaction } from "./types";

export type Totals = { income: number; expense: number; net: number };

export function sumTotals(transactions: Pick<Transaction, "type" | "amount">[]): Totals {
  let income = 0;
  let expense = 0;

  for (const t of transactions) {
    const amount = Number(t.amount);
    if (t.type === "income") income += amount;
    else if (t.type === "expense") expense += amount;
    // transfer is excluded from income/expense on purpose
  }

  return { income, expense, net: income - expense };
}

export function groupByMonth(
  transactions: Pick<Transaction, "type" | "amount" | "occurred_on">[],
  months: string[]
) {
  const base = new Map(months.map((m) => [m, { income: 0, expense: 0 }]));

  for (const t of transactions) {
    const key = t.occurred_on.slice(0, 7);
    const bucket = base.get(key);
    if (!bucket) continue;
    if (t.type === "income") bucket.income += Number(t.amount);
    else if (t.type === "expense") bucket.expense += Number(t.amount);
  }

  return months.map((m) => ({ month: m, ...base.get(m)! }));
}

export function groupByCategory(
  transactions: Pick<Transaction, "type" | "amount" | "category_id">[],
  categories: { id: string; name: string; color: string }[],
  type: "expense" | "income" = "expense"
) {
  const totals = new Map<string, number>();

  for (const t of transactions) {
    if (t.type !== type) continue;
    const key = t.category_id ?? "uncategorized";
    totals.set(key, (totals.get(key) ?? 0) + Number(t.amount));
  }

  const result = Array.from(totals.entries()).map(([id, value]) => {
    const category = categories.find((c) => c.id === id);
    return {
      name: category?.name ?? "Tanpa kategori",
      value,
      color: category?.color ?? "#B0B0B0",
    };
  });

  return result.sort((a, b) => b.value - a.value);
}

export function trend(current: number, previous: number) {
  if (!previous) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}
