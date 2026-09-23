"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteAccountAllocation, upsertAccountAllocation } from "@/app/actions/budgets";
import { ConfirmDelete } from "@/components/confirm-delete";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { formatCurrency, percent } from "@/lib/format";
import type { Account, AccountAllocation, Category, Transaction } from "@/lib/types";

type AccountOption = Pick<Account, "id" | "name">;
type CategoryOption = Pick<Category, "id" | "name" | "color">;

export function AccountAllocationDialog({
  accounts,
  categories,
  allocation,
  fixedAccountId,
  trigger,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
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
      <DialogTrigger asChild>{trigger ?? <Button><Plus className="h-4 w-4" /> Tambah pos</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{allocation ? "Ubah pos tetap" : "Buat pos tetap"}</DialogTitle>
          <DialogDescription>Nominal pos tersimpan terus dan tidak perlu dibuat ulang setiap bulan. Pemakaian dihitung dari transaksi pengeluaran.</DialogDescription>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          {allocation ? <input type="hidden" name="allocation_id" value={allocation.id} /> : null}
          {fixedAccountId ? <input type="hidden" name="account_id" value={fixedAccountId} /> : (
            <div className="space-y-2">
              <Label htmlFor="allocation_account_id">Sumber saldo</Label>
              <Select id="allocation_account_id" name="account_id" defaultValue={allocation?.account_id ?? ""}>
                <option value="">Semua akun / total saldo</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="pos_name">Nama pos</Label>
            <Input id="pos_name" name="pos_name" defaultValue={allocation?.category?.name ?? ""} placeholder="Contoh: GoPayLater, Makan, Transport" maxLength={100} />
            <p className="text-xs text-muted-foreground">Nama pos juga dipakai sebagai kategori transaksi.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="allocation_category_id">Atau pilih kategori yang sudah ada</Label>
            <Select id="allocation_category_id" name="category_id" defaultValue={allocation?.category_id ?? ""}>
              <option value="">Pilih bila nama pos dikosongkan</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="allocation_amount">Nominal pos tetap</Label>
            <MoneyInput id="allocation_amount" name="amount" min={1} defaultValue={allocation?.amount ?? ""} placeholder="500.000" required />
          </div>
          {error ? <p className="rounded-md bg-negative/10 px-3 py-2 text-sm text-negative">{error}</p> : null}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button type="submit" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />}{allocation ? "Simpan" : "Buat pos"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AccountAllocationClient({
  account,
  monthLabelText,
  allocations,
  categories,
  transactions,
}: {
  account: Account;
  monthLabelText: string;
  allocations: AccountAllocation[];
  categories: CategoryOption[];
  transactions: Pick<Transaction, "amount" | "category_id">[];
}) {
  const router = useRouter();
  const spent = useMemo(() => {
    const amounts = new Map<string, number>();
    transactions.forEach((transaction) => {
      if (transaction.category_id) amounts.set(transaction.category_id, (amounts.get(transaction.category_id) ?? 0) + Number(transaction.amount));
    });
    return amounts;
  }, [transactions]);
  const allocated = allocations.reduce((total, allocation) => total + Number(allocation.amount), 0);
  const available = Number(account.balance) - allocated;

  return <div className="account-detail-enter">
    <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/accounts")} className="mb-4 gap-2 text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Kembali ke Akun</Button>
    <PageHeader title={`Pos ${account.name}`} description="Nominal pos tetap; angka terpakai menunjukkan transaksi bulan ini." action={<AccountAllocationDialog accounts={[account]} fixedAccountId={account.id} categories={categories} />} />
    <Card className="account-detail-card-enter mb-5 overflow-hidden"><CardContent className="grid gap-4 p-5 sm:grid-cols-3">
      <div><p className="text-sm text-muted-foreground">Saldo akun</p><p className="tabular mt-1 text-2xl font-bold">{formatCurrency(Number(account.balance))}</p></div>
      <div><p className="text-sm text-muted-foreground">Total pos tetap</p><p className="tabular mt-1 text-2xl font-bold text-primary">{formatCurrency(allocated)}</p></div>
      <div><p className="text-sm text-muted-foreground">Belum dialokasikan</p><p className="tabular mt-1 text-2xl font-bold text-[hsl(var(--positive))]">{formatCurrency(available)}</p></div>
    </CardContent></Card>
    {allocations.length === 0 ? <Card><EmptyState title="Belum ada pos tetap" description="Buat pos seperti GoPayLater, Makan, atau Transport. Pos juga bisa dilihat bersama di halaman Pos Anggaran." /></Card> :
      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{allocations.map((allocation) => {
        const used = spent.get(allocation.category_id) ?? 0;
        const cap = Number(allocation.amount);
        const over = used > cap;
        return <Card key={allocation.id} className="p-5"><div className="flex items-start justify-between gap-2"><span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: allocation.category?.color ?? "#6D4CC6" }} /><span className="truncate font-semibold">{allocation.category?.name ?? "Pos tanpa nama"}</span></span><span className="flex shrink-0"><AccountAllocationDialog accounts={[account]} fixedAccountId={account.id} categories={categories} allocation={allocation} trigger={<Button variant="ghost" size="icon" aria-label="Ubah pos"><Pencil className="h-4 w-4" /></Button>} /><ConfirmDelete title="Hapus pos tetap?" description="Transaksi yang sudah dicatat tetap aman." onConfirm={() => deleteAccountAllocation(allocation.id)} trigger={<Button variant="ghost" size="icon" aria-label="Hapus pos"><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>} /></span></div><p className="tabular mt-5 text-lg font-bold">{formatCurrency(used)}</p><p className="text-xs text-muted-foreground">terpakai pada {monthLabelText} dari pos {formatCurrency(cap)}</p><Progress value={percent(used, cap)} className="mt-3" barClassName={over ? "bg-negative" : undefined} /><p className="mt-2 text-xs text-muted-foreground">{over ? `Lewat ${formatCurrency(used - cap)}` : `Sisa bulan ini ${formatCurrency(cap - used)}`}</p></Card>;
      })}</div>}
  </div>;
}
