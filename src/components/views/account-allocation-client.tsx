"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { upsertAccountAllocation } from "@/app/actions/budgets";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import type { Account, AccountAllocation } from "@/lib/types";

type AccountOption = Pick<Account, "id" | "name">;

export function AccountAllocationDialog({
  accounts,
  allocation,
  fixedAccountId,
  trigger,
}: {
  accounts: AccountOption[];
  allocation?: AccountAllocation;
  fixedAccountId?: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await upsertAccountAllocation(formData);
      if (!result.ok) return setError(result.error);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button><Plus className="h-4 w-4" />Tambah pos</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{allocation ? "Ubah pos" : "Tambah pos"}</DialogTitle>
          <DialogDescription>{allocation ? "Atur kebutuhan dan nominal yang sedang dicadangkan di pos ini." : "Tentukan kebutuhan pos. Pos dibuat kosong; isi nominalnya sendiri lewat tombol Isi Pos."} Saldo akun aktual tidak berubah saat dana dialokasikan.</DialogDescription>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          {allocation ? <input type="hidden" name="allocation_id" value={allocation.id} /> : null}
          {fixedAccountId ? <input type="hidden" name="account_id" value={fixedAccountId} /> : (
            <div className="space-y-2">
              <Label htmlFor="allocation_account_id">Akun sumber</Label>
              <Select id="allocation_account_id" name="account_id" defaultValue={allocation?.account_id ?? ""} required>
                <option value="">Pilih akun</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="pos_name">Nama pos</Label>
            <Input id="pos_name" name="pos_name" defaultValue={allocation?.category?.name ?? ""} placeholder="Contoh: KOST, Listrik, Wifi" maxLength={100} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="allocation_target_amount">Kebutuhan / target pos</Label>
            <MoneyInput id="allocation_target_amount" name="target_amount" min={1} defaultValue={allocation?.target_amount ?? ""} placeholder="1.500.000" required />
          </div>
          {allocation ? <div className="space-y-2">
            <Label htmlFor="allocation_funded_amount">Dana saat ini di dalam pos</Label>
            <MoneyInput id="allocation_funded_amount" name="allocated_amount" min={0} defaultValue={allocation.allocated_amount} placeholder="0" required />
            <p className="text-xs text-muted-foreground">Nominal ini adalah dana yang dicadangkan, bukan pengeluaran. Kenaikan dibatasi saldo tersedia akun.</p>
          </div> : null}
          {error ? <p role="alert" className="rounded-md bg-negative/10 px-3 py-2 text-sm text-negative">{error}</p> : null}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button type="submit" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />}{allocation ? "Simpan" : "Tambah pos"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
