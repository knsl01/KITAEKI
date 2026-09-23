"use client";

import Link from "next/link";
import { ArrowLeft, Landmark, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteAccountAllocation } from "@/app/actions/budgets";
import { BrandMarkTile } from "@/components/brand-mark";
import { ConfirmDelete } from "@/components/confirm-delete";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { AccountAllocationDialog } from "@/components/views/account-allocation-client";
import { formatCurrency } from "@/lib/format";
import { ACCOUNT_TYPE_LABEL, OWNER_LABEL, type Account, type AccountAllocation } from "@/lib/types";

function remainingPercent(remaining: number, original: number) {
  return original > 0 ? Math.max(0, Math.min(100, (remaining / original) * 100)) : 0;
}

export function AccountPositionsClient({
  account,
  allocations,
  spentByPost,
}: {
  account: Account;
  allocations: AccountAllocation[];
  spentByPost: Record<string, number>;
}) {
  const totalSpent = allocations.reduce((sum, allocation) => sum + (spentByPost[allocation.id] ?? 0), 0);
  const totalRemaining = allocations.reduce((sum, allocation) => sum + Math.max(Number(allocation.amount) - (spentByPost[allocation.id] ?? 0), 0), 0);
  const available = Number(account.balance) - totalRemaining;

  return (
    <div className="account-detail-enter">
      <PageHeader
        title={account.name}
        description={`Pos anggaran · ${ACCOUNT_TYPE_LABEL[account.type]} · ${OWNER_LABEL[account.owner]}`}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link href="/dashboard/accounts"><ArrowLeft className="h-4 w-4" />Kembali</Link></Button>
            <AccountAllocationDialog accounts={[account]} fixedAccountId={account.id} trigger={<Button disabled={!account.is_active}><Plus className="h-4 w-4" />Tambah pos</Button>} />
          </div>
        }
      />

      <Card className="account-detail-card-enter mb-5 overflow-hidden">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex items-center gap-3"><BrandMarkTile iconKey={account.icon_key} name={account.name} size="lg" /><div><p className="text-xs text-muted-foreground">Saldo akun</p><p className="tabular text-2xl font-bold tracking-tight">{formatCurrency(Number(account.balance))}</p></div></div>
          <div className="grid grid-cols-3 gap-4 sm:min-w-[420px]">
            <div><p className="text-xs text-muted-foreground">Anggaran tersisa</p><p className="tabular mt-1 font-semibold">{formatCurrency(totalRemaining)}</p></div>
            <div><p className="text-xs text-muted-foreground">Terpakai</p><p className="tabular mt-1 font-semibold text-negative">{formatCurrency(totalSpent)}</p></div>
            <div><p className="text-xs text-muted-foreground">Tersedia</p><p className={`tabular mt-1 font-semibold ${available < 0 ? "text-negative" : "text-[hsl(var(--positive))]"}`}>{formatCurrency(available)}</p></div>
          </div>
        </CardContent>
      </Card>

      <div className="account-detail-list-enter mb-3 flex items-end justify-between gap-3">
        <div><h2 className="font-serif text-xl">Pos anggaran</h2><p className="mt-1 text-sm text-muted-foreground">Sisa nominal ditampilkan bersama persentase budget yang masih tersedia.</p></div>
        <span className="shrink-0 text-sm text-muted-foreground">{allocations.length} pos</span>
      </div>

      {allocations.length === 0 ? (
        <Card><EmptyState title="Belum ada pos di akun ini" description="Tambahkan pos untuk menandai sebagian saldo khusus untuk kebutuhan tertentu." action={account.is_active ? <AccountAllocationDialog accounts={[account]} fixedAccountId={account.id} trigger={<Button><Plus className="h-4 w-4" />Tambah pos</Button>} /> : undefined} /></Card>
      ) : (
        <div className="account-detail-list-enter grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {allocations.map((allocation) => {
            const original = Number(allocation.amount);
            const spent = spentByPost[allocation.id] ?? 0;
            const remaining = Math.max(original - spent, 0);
            const percent = remainingPercent(remaining, original);
            return (
              <Card key={allocation.id} className="account-detail-row overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><h3 className="truncate font-semibold">{allocation.category?.name ?? "Pos"}</h3><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Landmark className="h-3.5 w-3.5" />{account.name}</p></div>
                    <p className="tabular shrink-0 text-right text-sm font-semibold">{formatCurrency(remaining)}<span className="block text-[10px] font-normal text-muted-foreground">tersisa</span></p>
                  </div>
                  <Progress value={percent} className="mt-4 h-2" />
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground"><span>{percent.toFixed(1)}% tersisa</span><span>Budget {formatCurrency(original)}</span></div>
                  <p className="mt-1 text-[11px] text-muted-foreground">Terpakai {formatCurrency(spent)}</p>
                  <div className="mt-3 flex justify-end gap-1 border-t border-border pt-2">
                    <AccountAllocationDialog accounts={[account]} fixedAccountId={account.id} allocation={allocation} trigger={<Button variant="ghost" size="sm" disabled={!account.is_active}><Pencil className="h-3.5 w-3.5" />Ubah</Button>} />
                    <ConfirmDelete title="Hapus pos?" description="Transaksi yang sudah tercatat tetap ada. Sisa budget yang belum terpakai kembali menjadi saldo tersedia." onConfirm={() => deleteAccountAllocation(allocation.id)} trigger={<Button variant="ghost" size="sm"><Trash2 className="h-3.5 w-3.5" />Hapus</Button>} />
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
