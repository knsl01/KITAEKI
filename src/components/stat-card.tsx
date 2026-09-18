import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  trend,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: number;
  trend?: number | null;
  tone?: "neutral" | "positive" | "negative";
  hint?: string;
}) {
  const up = (trend ?? 0) >= 0;

  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tabular mt-2 text-2xl font-medium tracking-tight",
          tone === "positive" && "text-[hsl(var(--positive))]",
          tone === "negative" && "text-[hsl(var(--negative))]"
        )}
      >
        {formatCurrency(value)}
      </p>
      {typeof trend === "number" ? (
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {Math.abs(trend)}% dari bulan lalu
        </p>
      ) : hint ? (
        <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </Card>
  );
}
