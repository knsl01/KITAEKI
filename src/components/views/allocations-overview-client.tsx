"use client";

import { useMemo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { deleteAccountAllocation } from "@/app/actions/budgets";
import { ConfirmDelete } from "@/components/confirm-delete";
import { PageHeader } from "@/components/page-header";
import { AccountAllocationDialog } from "@/components/views/account-allocation-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, percent } from "@/lib/format";
import { OWNER_LABEL, type Account, type AccountAllocation, type Category, type MemberOwner, type Transaction } from "@/lib/types";

type Tx = Pick<Transaction, "amount" | "category_id" | "account_id">;

export function AllocationsOverviewClient({
  accounts,
  allocations,
  categories,
  transactions,
  view,
  monthLabelText,
}: {
  accounts: Account[];
  allocations: AccountAllocation[];
  categories: Pick<Category, "id" | "name" | "color">[];
  transactions: Tx[];
  view: MemberOwner | "bersama";
  monthLabelText: string;
}) {
  const activeAccounts = accounts.filter((account) => account.is_active);
  const visibleAccounts = activeAccounts.filter((account) => view === "bersama" || account.owner === view || account.owner === "shared");
  const visibleAccountIds = new Set(visibleAccounts.map((account) => account.id));
  const visibleAllocations = allocations.filter((allocation) => !allocation.account_id || visibleAccountIds.has(allocation.account_id));
  const totalAllocated = visibleAllocations.reduce((sum, allocation) => sum + Number(allocation.amount), 0);
  const totalSpent = transactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const rows = useMemo(() => visibleAllocations.map((allocation) => {
    const spent = transactions.reduce((sum, transaction) => {
      const accountMatches = allocation.account_id ? transaction.account_id === allocation.account_id : true;
      return accountMatches && transaction.category_id === allocation.category_id ? sum + Number(transaction.amount) : sum;
    }, 0);
    return { allocation, spent, amount: Number(allocation.amount) };
  }), [visibleAllocations, transactions]);

  return <div>
    <PageHeader
      title="Pos Anggaran"
      description="Semua pos tetap terlihat di satu tempat. Nominalnya tidak perlu dibuat ulang setiap bulan."
      action={<AccountAllocationDialog accounts={visibleAccounts} categories={categories} />}
    />
    <Card className="mb-5"><CardContent className="grid gap-4 p-5 sm:grid-cols-3">
      <div><p className="text-sm text-muted-foreground">Total pos tetap</p><p className="tabular mt-1 text-xl font-bold">{formatCurrency(totalAllocated)}</p></div>
      <div><p className="text-sm text-muted-foreground">Pengeluaran {monthLabelText}</p><p className="tabular mt-1 text-xl font-bold text-negative">{formatCurrency(totalSpent)}</p></div>
      <div><p className="text-sm text-muted-foreground">Jumlah pos</p><p className="tabular mt-1 text-xl font-bold">{visibleAllocations.length}</p></div>
    </CardContent></Card>
    {rows.length === 0 ? <Card><EmptyState title="Belum ada pos tetap" description="Buat pos untuk semua akun atau khusus satu akun. Setelah dibuat, posnya bisa dilihat di halaman ini dan dipilih saat mencatat pengeluaran." /></Card> :
      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rows.map(({ allocation, spent, amount }) => {
        const category = categoryById.get(allocation.category_id);
        const account = allocation.account_id ? accountById.get(allocation.account_id) : null;
        const over = spent > amount;
        return <Card key={allocation.id} className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category?.color ?? "#6D4CC6" }} /><p className="truncate font-semibold">{category?.name ?? "Pos tanpa kategori"}</p></div>
              <p className="mt-1 truncate text-xs text-muted-foreground">{account ? `${account.name} · ${OWNER_LABEL[account.owner]}` : "Semua akun · total saldo"}</p>
            </div>
            <span className="flex shrink-0">
              <AccountAllocationDialog accounts={visibleAccounts} categories={categories} allocation={allocation} trigger={<Button variant="ghost" size="icon" aria-label={`Ubah pos ${category?.name ?? "anggaran"}`}><Pencil className="h-4 w-4" /></Button>} />
              <ConfirmDelete title="Hapus pos tetap?" description="Transaksi yang sudah dicatat tetap aman." onConfirm={() => deleteAccountAllocation(allocation.id)} trigger={<Button variant="ghost" size="icon" aria-label={`Hapus pos ${category?.name ?? "anggaran"}`}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>} />
            </span>
          </div>
          <p className="tabular mt-5 text-lg font-bold">{formatCurrency(spent)}</p>
          <p className="text-xs text-muted-foreground">terpakai pada {monthLabelText} dari pos tetap {formatCurrency(amount)}</p>
          <Progress value={percent(spent, amount)} className="mt-3" barClassName={over ? "bg-negative" : undefined} />
          <p className="mt-2 text-xs text-muted-foreground">{over ? `Lewat ${formatCurrency(spent - amount)}` : `Sisa bulan ini ${formatCurrency(amount - spent)}`}</p>
        </Card>;
      })}</div>}
  </div>;
}
