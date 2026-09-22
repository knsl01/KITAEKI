"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteBudget, upsertBudget } from "@/app/actions/budgets";
import { ConfirmDelete } from "@/components/confirm-delete";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { formatCurrency, lastMonths, monthLabel, percent } from "@/lib/format";
import type { Budget, Category, Transaction } from "@/lib/types";

type Props = {
  month: string;
  budgets: Budget[];
  categories: Category[];
  transactions: Pick<Transaction, "amount" | "type" | "category_id">[];
};

function BudgetDialog({ month, categories, budget, trigger }: { month: string; categories: Category[]; budget?: Budget; trigger?: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await upsertBudget(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" />
            Tambah pos
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{budget ? "Atur pos anggaran" : "Tambah pos anggaran"}</DialogTitle>
          <DialogDescription>
            {budget ? "Ubah batas pos ini sesuai kebutuhan bulan berjalan." : "Satu kategori punya satu pos anggaran per bulan. Mengisi ulang kategori yang sama akan menimpa nilainya."}
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="space-y-4">
          <input type="hidden" name="period_month" value={month} />

          <div className="space-y-2">
            <Label htmlFor="category_id">Kategori</Label>
            <Select id="category_id" name="category_id" defaultValue={budget?.category_id ?? ""} required>
              <option value="">Pilih kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Batas bulan ini</Label>
            <MoneyInput id="amount" name="amount" min={1} placeholder="1.500.000" defaultValue={budget?.amount ?? ""} required />
          </div>

          {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {budget ? "Simpan perubahan" : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BudgetClient({ month, budgets, categories, transactions }: Props) {
  const router = useRouter();

  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (!t.category_id) continue;
      map.set(t.category_id, (map.get(t.category_id) ?? 0) + Number(t.amount));
    }
    return map;
  }, [transactions]);
  
  const otherSpent = useMemo(() => {
    let sum = 0;
    const budgetedCategoryIds = new Set(budgets.map(b => b.category_id));
    for (const t of transactions) {
      if (!t.category_id || !budgetedCategoryIds.has(t.category_id)) {
        sum += Number(t.amount);
      }
    }
    return sum;
  }, [transactions, budgets]);

  const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (spentByCategory.get(b.category_id) ?? 0), 0) + otherSpent;

  return (
    <div>
      <PageHeader
        title="Pos Anggaran"
        description="Atur pos-pos anggaran untuk setiap keperluan pengeluaran."
        action={<BudgetDialog month={month} categories={categories} />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          value={month}
          onChange={(e) => router.push(`/dashboard/budget?month=${e.target.value}`)}
          className="w-auto min-w-[180px]"
          aria-label="Pilih bulan"
        >
          {lastMonths(12).reverse().map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </Select>
      </div>

      <Card className="mb-4">
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Total anggaran</p>
            <p className="tabular mt-1 text-xl font-bold">{formatCurrency(totalBudget)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Terpakai</p>
            <p className="tabular mt-1 text-xl font-bold">{formatCurrency(totalSpent)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Sisa</p>
            <p className="tabular mt-1 text-xl font-bold">{formatCurrency(totalBudget - totalSpent)}</p>
          </div>
        </CardContent>
      </Card>

      {budgets.length === 0 && otherSpent === 0 ? (
        <Card>
          <EmptyState
            title={`Belum ada pos anggaran untuk ${monthLabel(month)}`}
            description="Tentukan batas belanja per kategori untuk bulan ini."
          />
        </Card>
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {otherSpent > 0 && (
            <Card className="p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground" />
                  <span className="truncate font-medium">Lain lain</span>
                </span>
              </div>
              <p className="tabular mt-4 text-lg font-bold">{formatCurrency(otherSpent)}</p>
              <p className="tabular text-xs text-muted-foreground">Pengeluaran di luar pos anggaran</p>
              <Progress value={100} className="mt-3" barClassName="bg-muted-foreground" />
              <p className="mt-2 text-xs text-muted-foreground">Tidak ada batas pos</p>
            </Card>
          )}
          {budgets.map((budget) => {
            const spent = spentByCategory.get(budget.category_id) ?? 0;
            const pct = percent(spent, Number(budget.amount));
            const over = spent > Number(budget.amount);

            return (
              <Card key={budget.id} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: budget.category?.color ?? "#B0B0B0" }}
                    />
                    <span className="truncate font-medium">{budget.category?.name ?? "Kategori dihapus"}</span>
                  </span>
                  <ConfirmDelete
                    title="Hapus pos anggaran?"
                    onConfirm={async () => deleteBudget(budget.id)}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label="Hapus pos anggaran">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    }
                  />
                  <BudgetDialog
                    month={month}
                    categories={categories}
                    budget={budget}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={`Atur pos ${budget.category?.name ?? "anggaran"}`}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    }
                  />
                </div>

                <p className="tabular mt-4 text-lg font-bold">{formatCurrency(spent)}</p>
                <p className="tabular text-xs text-muted-foreground">dari {formatCurrency(Number(budget.amount))}</p>

                <Progress
                  value={pct}
                  className="mt-3"
                  barClassName={over ? "bg-[hsl(var(--negative))]" : undefined}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {over ? `Lewat ${formatCurrency(spent - Number(budget.amount))}` : `Sisa ${formatCurrency(Number(budget.amount) - spent)}`}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
