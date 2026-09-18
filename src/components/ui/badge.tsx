import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "positive" | "negative" | "outline";
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-muted text-muted-foreground",
        tone === "positive" && "bg-emerald-50 text-emerald-700",
        tone === "negative" && "bg-rose-50 text-rose-700",
        tone === "outline" && "border border-border text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
