import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TransactionType } from "@/lib/types";

export function TransactionAmount({
  type,
  amount,
  className,
}: {
  type: TransactionType;
  amount: number;
  className?: string;
}) {
  const sign = type === "income" ? "+" : type === "expense" ? "−" : "";
  return (
    <span
      className={cn(
        "tabular font-medium",
        type === "income" && "text-[hsl(var(--positive))]",
        type === "expense" && "text-[hsl(var(--negative))]",
        type === "transfer" && "text-muted-foreground",
        className
      )}
    >
      {sign} {formatCurrency(Number(amount))}
    </span>
  );
}
