"use client";

import Link from "next/link";
import { ArrowLeft, Landmark, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteAccountAllocation } from "@/app/actions/budgets";
import { ConfirmDelete } from "@/components/confirm-delete";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { AccountAllocationDialog } from "@/components/views/account-allocation-client";
import { formatCurrency } from "@/lib/format";
import type { Account, AccountAllocation } from "@/lib/types";

function spentPercent(spent: number, original: number) {
  return original > 0 ? Math.max(0, (spent / original) * 100) : 0;
}

export function AllocationsOverviewClient({
  accounts,
  allocations,
  spentByPost,
}: {
  accounts: Account[];
  allocations: AccountAllocation[];
  spentByPost: Record<string, number>;
}) {
  const activeAccounts = accounts.filter((account) => account.is_active);
  const totalOriginal = allocations.reduce((sum, allocation) => sum + Number(allocation.amount), 0);
  const totalSpent = allocations.reduce((sum, allocation) => sum + (spentByPost[allocation.id] ?? 0), 0);
  const totalRemaining = allocations.reduce((sum, allocation) => sum + Math.max(Number(allocation.amount) - (spentByPost[allocation.id] ?? 0), 0), 0);

  return (
    <div>
      <PageHeader
        title="Anggaran"
        description="Semua pos dari setiap akun ada di sini. Pos tetap terhubung ke akun sumbernya."
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link href="/dashboard/accounts"><ArrowLeft className="h-4 w-4" />Kembali ke Akun</Link></Button>
            <AccountAllocationDialog accounts={activeAccounts} trigger={<Button disabled={activeAccounts.length === 0}><Plus className="h-4 w-4" />Tambah pos</Button>} />
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total anggaran tersisa</p><p className="tabular mt-1 text-xl font-bold">{formatCurrency(totalRemaining)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Sudah digunakan</p><p className="tabular mt-1 text-xl font-bold text-negative">{formatCurrency(totalSpent)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total budget awal</p><p className="tabular mt-1 text-xl font-bold text-primary">{formatCurrency(totalOriginal)}</p></CardContent></Card>
      </div>

      {allocations.length === 0 ? (
        <Card><EmptyState title="Belum ada pos anggaran" description="Buat pos dari tombol di atas. Pilih akun sumber, nama pos, dan nominalnya." action={activeAccounts.length ? <AccountAllocationDialog accounts={activeAccounts} trigger={<Button><Plus className="h-4 w-4" />Tambah pos</Button>} /> : undefined} /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {allocations.map((allocation) => {
            const original = Number(allocation.amount);
            const spent = spentByPost[allocation.id] ?? 0;
            const remaining = Math.max(original - spent, 0);
            const percent = spentPercent(spent, original);
            const account = accounts.find((candidate) => candidate.id === allocation.account_id);
            const accountOptions = account ? [account, ...activeAccounts.filter((candidate) => candidate.id !== account.id)] : activeAccounts;

            return (
              <Card key={allocation.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold">{allocation.category?.name ?? "Pos"}</h2>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Landmark className="h-3.5 w-3.5" />{account?.name ?? "Akun belum dipilih"}</p>
                    </div>
                    <p className="tabular shrink-0 text-right text-sm font-semibold">{formatCurrency(remaining)}<span className="block text-[10px] font-normal text-muted-foreground">tersisa</span></p>
                  </div>
                  <Progress value={percent} className="mt-4 h-2" />
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>{percent.toFixed(1)}% terpakai</span>
                    <span>Budget {formatCurrency(original)} · sisa {formatCurrency(remaining)}</span>
                  </div>
                  <div className="mt-3 flex justify-end gap-1 border-t border-border pt-2">
                    <AccountAllocationDialog accounts={accountOptions} allocation={allocation} trigger={<Button variant="ghost" size="sm" disabled={activeAccounts.length === 0} aria-label={`Ubah ${allocation.category?.name ?? "pos"}`}><Pencil className="h-3.5 w-3.5" />Ubah</Button>} />
                    <ConfirmDelete
                      title="Hapus pos?"
                      description="Transaksi yang sudah tercatat tetap ada. Sisa budget yang belum terpakai kembali menjadi saldo tersedia."
                      onConfirm={() => deleteAccountAllocation(allocation.id)}
                      trigger={<Button variant="ghost" size="sm" aria-label={`Hapus ${allocation.category?.name ?? "pos"}`}><Trash2 className="h-3.5 w-3.5" />Hapus</Button>}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
