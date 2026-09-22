"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteBudget, upsertBudget } from "@/app/actions/budgets";
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
import { formatCurrency, lastMonths, monthLabel, percent } from "@/lib/format";
import type { Account, Budget, Category, Transaction } from "@/lib/types";

type Props = {
  account: Account;
  month: string;
  budgets: Budget[];
  categories: Pick<Category, "id" | "name" | "color">[];
  transactions: Pick<Transaction, "amount" | "category_id">[];
};

function AllocationDialog({ accountId, month, categories, budget, trigger }: {
  accountId: string; month: string; categories: Props["categories"]; budget?: Budget; trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await upsertBudget(formData);
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
          <DialogTitle>{budget ? "Atur pos" : "Buat pos alokasi"}</DialogTitle>
          <DialogDescription>Nama pos juga menjadi kategori otomatis saat dipilih pada transaksi pengeluaran.</DialogDescription>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          <input type="hidden" name="account_id" value={accountId} />
          <input type="hidden" name="period_month" value={month} />
          <div className="space-y-2">
            <Label htmlFor="pos_name">Nama pos</Label>
            <Input id="pos_name" name="pos_name" defaultValue={budget?.category?.name ?? ""} placeholder="Contoh: GoPayLater, Makan, Transport" />
            <p className="text-xs text-muted-foreground">Tulis nama baru untuk membuat pos sendiri, atau pilih kategori yang sudah ada di bawah.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category_id">Kategori yang sudah ada</Label>
            <Select id="category_id" name="category_id" defaultValue={budget?.category_id ?? ""}>
              <option value="">Pilih bila tidak menulis nama pos</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Dana dialokasikan</Label>
            <MoneyInput id="amount" name="amount" min={1} defaultValue={budget?.amount ?? ""} placeholder="500.000" required />
          </div>
          {error && <p className="rounded-md bg-negative/10 px-3 py-2 text-sm text-negative">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button type="submit" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />}{budget ? "Simpan" : "Buat pos"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AccountAllocationClient({ account, month, budgets, categories, transactions }: Props) {
  const router = useRouter();
  const spent = useMemo(() => {
    const amounts = new Map<string, number>();
    transactions.forEach((transaction) => transaction.category_id && amounts.set(transaction.category_id, (amounts.get(transaction.category_id) ?? 0) + Number(transaction.amount)));
    return amounts;
  }, [transactions]);
  const allocated = budgets.reduce((total, budget) => total + Number(budget.amount), 0);
  const available = Number(account.balance) - allocated;

  return <div className="account-detail-enter">
    <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/accounts")} className="mb-4 gap-2 text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Kembali ke Akun</Button>
    <PageHeader title={`Alokasi ${account.name}`} description="Bagi saldo akun ini ke pos kebutuhan yang kalian buat sendiri." action={<AllocationDialog accountId={account.id} month={month} categories={categories} />} />
    <Card className="account-detail-card-enter mb-5 overflow-hidden"><CardContent className="grid gap-4 p-5 sm:grid-cols-3">
      <div><p className="text-sm text-muted-foreground">Saldo akun</p><p className="tabular mt-1 text-2xl font-bold">{formatCurrency(Number(account.balance))}</p></div>
      <div><p className="text-sm text-muted-foreground">Sudah dialokasikan</p><p className="tabular mt-1 text-2xl font-bold text-primary">{formatCurrency(allocated)}</p></div>
      <div><p className="text-sm text-muted-foreground">Belum dibagi</p><p className="tabular mt-1 text-2xl font-bold text-[hsl(var(--positive))]">{formatCurrency(available)}</p></div>
    </CardContent></Card>
    <Select value={month} onChange={(event) => router.push(`/dashboard/accounts/${account.id}?month=${event.target.value}`)} className="mb-4 w-auto min-w-[180px]">
      {lastMonths(12).reverse().map((value) => <option key={value} value={value}>{monthLabel(value)}</option>)}
    </Select>
    {budgets.length === 0 ? <Card><EmptyState title="Belum ada pos alokasi" description="Buat pos seperti GoPayLater, Makan, atau Transport untuk membagi saldo akun ini." /></Card> :
      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{budgets.map((budget) => {
        const used = spent.get(budget.category_id) ?? 0; const cap = Number(budget.amount); const over = used > cap;
        return <Card key={budget.id} className="p-5"><div className="flex items-start justify-between gap-2"><span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: budget.category?.color ?? "#6D4CC6" }} /><span className="truncate font-semibold">{budget.category?.name ?? "Pos tanpa nama"}</span></span><span className="flex shrink-0"><AllocationDialog accountId={account.id} month={month} categories={categories} budget={budget} trigger={<Button variant="ghost" size="icon" aria-label="Ubah pos"><Pencil className="h-4 w-4" /></Button>} /><ConfirmDelete title="Hapus pos alokasi?" description="Pengeluaran yang sudah tercatat tidak akan ikut terhapus." onConfirm={() => deleteBudget(budget.id)} trigger={<Button variant="ghost" size="icon" aria-label="Hapus pos"><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>} /></span></div><p className="tabular mt-5 text-lg font-bold">{formatCurrency(used)}</p><p className="text-xs text-muted-foreground">terpakai dari {formatCurrency(cap)}</p><Progress value={percent(used, cap)} className="mt-3" barClassName={over ? "bg-negative" : undefined} /><p className="mt-2 text-xs text-muted-foreground">{over ? `Lewat ${formatCurrency(used - cap)}` : `Sisa ${formatCurrency(cap - used)}`}</p></Card>;
      })}</div>}
  </div>;
}
