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
import { FillAllocationButton } from "@/components/views/fill-allocation-button";
import { formatCurrency } from "@/lib/format";
import { ACCOUNT_TYPE_LABEL, OWNER_LABEL, type Account, type AccountAllocation } from "@/lib/types";

function percent(value: number, target: number) {
  return target > 0 ? Math.min(100, Math.max(0, (value / target) * 100)) : 0;
}

export function AccountPositionsClient({ account, allocations }: { account: Account; allocations: AccountAllocation[] }) {
  const totalSpent = allocations.reduce((sum, allocation) => sum + Number(allocation.spent_amount), 0);
  const totalAllocated = allocations.reduce((sum, allocation) => sum + Number(allocation.allocated_amount), 0);
  const available = Number(account.balance) - totalAllocated;

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
            <div><p className="text-xs text-muted-foreground">Dicadangkan</p><p className="tabular mt-1 font-semibold">{formatCurrency(totalAllocated)}</p></div>
            <div><p className="text-xs text-muted-foreground">Terpakai</p><p className="tabular mt-1 font-semibold text-negative">{formatCurrency(totalSpent)}</p></div>
            <div><p className="text-xs text-muted-foreground">Tersedia</p><p className={`tabular mt-1 font-semibold ${available < 0 ? "text-negative" : "text-[hsl(var(--positive))]"}`}>{formatCurrency(available)}</p></div>
          </div>
        </CardContent>
      </Card>

      <div className="account-detail-list-enter mb-3 flex items-end justify-between gap-3">
        <div><h2 className="font-serif text-xl">Pos anggaran</h2><p className="mt-1 text-sm text-muted-foreground">Setiap pos menunjukkan target, dana yang masih tersedia, dan pengeluaran aktual.</p></div>
        <span className="shrink-0 text-sm text-muted-foreground">{allocations.length} pos</span>
      </div>

      {allocations.length === 0 ? (
        <Card><EmptyState title="Belum ada pos di akun ini" description="Tambahkan target kebutuhan. Pos baru dimulai kosong, lalu kamu tentukan sendiri nominalnya lewat Isi Pos." action={account.is_active ? <AccountAllocationDialog accounts={[account]} fixedAccountId={account.id} trigger={<Button><Plus className="h-4 w-4" />Tambah pos</Button>} /> : undefined} /></Card>
      ) : (
        <div className="account-detail-list-enter grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {allocations.map((allocation) => {
            const target = Number(allocation.target_amount);
            const allocated = Number(allocation.allocated_amount);
            const spent = Number(allocation.spent_amount);
            const remainingNeed = Math.max(target - allocated, 0);
            const progress = percent(allocated, target);
            return (
              <Card key={allocation.id} className="account-detail-row overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><h3 className="truncate font-semibold">{allocation.category?.name ?? "Pos"}</h3><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Landmark className="h-3.5 w-3.5" />{account.name}</p></div>
                    <p className="tabular shrink-0 text-right text-sm font-semibold">{formatCurrency(allocated)}<span className="block text-[10px] font-normal text-muted-foreground">terisi / tersedia</span></p>
                  </div>
                  <Progress value={progress} className="mt-4 h-2" />
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground"><span>{progress.toFixed(1)}% terisi</span><span>Kebutuhan {formatCurrency(target)}</span></div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg bg-muted/40 p-3 text-xs"><div><p className="text-muted-foreground">Terpakai</p><p className="tabular mt-0.5 font-semibold text-negative">{formatCurrency(spent)}</p></div><div className="text-right"><p className="text-muted-foreground">Sisa kebutuhan</p><p className="tabular mt-0.5 font-semibold">{formatCurrency(remainingNeed)}</p></div></div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                    <div className="flex items-center gap-1">
                      <AccountAllocationDialog accounts={[account]} fixedAccountId={account.id} allocation={allocation} trigger={<Button variant="ghost" size="sm" disabled={!account.is_active}><Pencil className="h-3.5 w-3.5" />Ubah</Button>} />
                      <ConfirmDelete title="Hapus pos?" description="Sisa dana yang masih dicadangkan dilepas menjadi saldo tersedia. Pengeluaran yang sudah tercatat tetap mengurangi saldo akun dan tidak dikembalikan." onConfirm={() => deleteAccountAllocation(allocation.id)} trigger={<Button variant="ghost" size="sm"><Trash2 className="h-3.5 w-3.5" />Hapus</Button>} />
                    </div>
                    {remainingNeed > 0 && account.is_active ? <FillAllocationButton allocationId={allocation.id} remainingNeed={remainingNeed} /> : <span className="text-xs text-muted-foreground">{remainingNeed > 0 ? "Akun tidak aktif" : "Target terisi"}</span>}
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
