"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { fillAccountAllocation } from "@/app/actions/budgets";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { formatCurrency } from "@/lib/format";

export function FillAllocationButton({ allocationId, remainingNeed, className }: { allocationId: string; remainingNeed: number; className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData): void {
    setError(null);
    const amount = Number(formData.get("amount"));
    startTransition(async () => {
      const result = await fillAccountAllocation(allocationId, amount);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className={className}>
      <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setError(null); }}>
        <DialogTrigger asChild><Button type="button" variant="outline" size="sm"><Plus className="h-4 w-4" />Isi Pos</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Isi Pos</DialogTitle>
            <DialogDescription>Masukkan sendiri berapa dana yang ingin dicadangkan sekarang. Sisa kebutuhan pos {formatCurrency(remainingNeed)}. Saldo aktual akun tidak berkurang.</DialogDescription>
          </DialogHeader>
          <form action={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`fill-allocation-${allocationId}`}>Nominal yang ingin dimasukkan</Label>
              <MoneyInput id={`fill-allocation-${allocationId}`} name="amount" min={1} placeholder="Contoh: 200.000" required autoFocus />
            </div>
            {error ? <p role="alert" className="rounded-md bg-negative/10 px-3 py-2 text-sm text-negative">{error}</p> : null}
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button type="submit" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Alokasikan</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
