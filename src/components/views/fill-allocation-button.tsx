"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { fillAccountAllocation } from "@/app/actions/budgets";
import { Button } from "@/components/ui/button";

export function FillAllocationButton({ allocationId, className }: { allocationId: string; className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function fill() {
    setError(null);
    startTransition(async () => {
      const result = await fillAccountAllocation(allocationId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className={className}>
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={fill}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Isi Pos
      </Button>
      {error ? <p role="alert" className="mt-1 text-right text-[11px] text-negative">{error}</p> : null}
    </div>
  );
}
