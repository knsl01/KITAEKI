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
import { FillAllocationButton } from "@/components/views/fill-allocation-button";
import { formatCurrency } from "@/lib/format";
import type { Account, AccountAllocation, MemberOwner } from "@/lib/types";

function percent(value: number, target: number) {
  return target > 0 ? Math.min(100, Math.max(0, (value / target) * 100)) : 0;
}

export function AllocationsOverviewClient({
  accounts,
  allocations,
  ownerLabels,
}: {
  accounts: Account[];
  allocations: AccountAllocation[];
  ownerLabels: Record<MemberOwner, string>;
}) {
  const activeAccounts = accounts.filter((account) => account.is_active);
  const totalSpent = allocations.reduce((sum, allocation) => sum + Number(allocation.spent_amount), 0);
  const totalAllocated = allocations.reduce((sum, allocation) => sum + Number(allocation.allocated_amount), 0);
  const remainingNeed = allocations.reduce((sum, allocation) => sum + Math.max(Number(allocation.target_amount) - Number(allocation.allocated_amount), 0), 0);
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const groups: { key: MemberOwner | "unassigned"; title: string; allocations: AccountAllocation[] }[] = [
    { key: "eki", title: ownerLabels.eki, allocations: [] },
    { key: "dinda", title: ownerLabels.dinda, allocations: [] },
    { key: "shared", title: ownerLabels.shared, allocations: [] },
    { key: "unassigned", title: "Belum terhubung ke akun", allocations: [] },
  ];
  for (const allocation of allocations) {
    const owner = allocation.account_id ? accountById.get(allocation.account_id)?.owner : undefined;
    groups.find((candidate) => candidate.key === (owner ?? "unassigned"))?.allocations.push(allocation);
  }
  const visibleGroups = groups.filter((group) => group.allocations.length > 0);

  return (
    <div>
      <PageHeader
        title="Anggaran"
        description="Target kebutuhan, dana yang masih dicadangkan, dan pengeluaran aktual setiap pos."
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link href="/dashboard/accounts"><ArrowLeft className="h-4 w-4" />Kembali ke Akun</Link></Button>
            <AccountAllocationDialog accounts={activeAccounts} trigger={<Button disabled={activeAccounts.length === 0}><Plus className="h-4 w-4" />Tambah pos</Button>} />
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total anggaran · masih dicadangkan</p><p className="tabular mt-1 text-xl font-bold">{formatCurrency(totalAllocated)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pengeluaran dari pos</p><p className="tabular mt-1 text-xl font-bold text-negative">{formatCurrency(totalSpent)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Sisa target yang belum terisi</p><p className="tabular mt-1 text-xl font-bold text-primary">{formatCurrency(remainingNeed)}</p></CardContent></Card>
      </div>

      {allocations.length === 0 ? (
        <Card><EmptyState title="Belum ada pos anggaran" description="Buat pos dengan menentukan kebutuhan dan akun sumber. Pos baru dimulai dari nominal kosong; kamu mengisi dananya sendiri." action={activeAccounts.length ? <AccountAllocationDialog accounts={activeAccounts} trigger={<Button><Plus className="h-4 w-4" />Tambah pos</Button>} /> : undefined} /></Card>
      ) : (
        <div className="space-y-7">
          {visibleGroups.map((group) => {
            const groupAllocated = group.allocations.reduce((sum, allocation) => sum + Number(allocation.allocated_amount), 0);
            return <section key={group.key} aria-labelledby={`budget-owner-${group.key}`} className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border pb-2">
                <div><h2 id={`budget-owner-${group.key}`} className="font-serif text-xl tracking-tight">{group.title}</h2><p className="mt-0.5 text-xs text-muted-foreground">Pos anggaran berdasarkan pemilik akun sumber</p></div>
                <span className="tabular text-xs text-muted-foreground">{group.allocations.length} pos · {formatCurrency(groupAllocated)} dicadangkan</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.allocations.map((allocation) => {
                  const target = Number(allocation.target_amount);
                  const allocated = Number(allocation.allocated_amount);
                  const spent = Number(allocation.spent_amount);
                  const remainingNeedForPost = Math.max(target - allocated, 0);
                  const progress = percent(allocated, target);
                  const account = accounts.find((candidate) => candidate.id === allocation.account_id);
                  const accountOptions = account ? [account, ...activeAccounts.filter((candidate) => candidate.id !== account.id)] : activeAccounts;

                  return (
                    <Card key={allocation.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold">{allocation.category?.name ?? "Pos"}</h3>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Landmark className="h-3.5 w-3.5" />{account?.name ?? "Akun belum dipilih"}</p>
                          </div>
                          <p className="tabular shrink-0 text-right text-sm font-semibold">{formatCurrency(allocated)}<span className="block text-[10px] font-normal text-muted-foreground">terisi / tersedia</span></p>
                        </div>
                        <Progress value={progress} className="mt-4 h-2" />
                        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground"><span>{progress.toFixed(1)}% terisi</span><span>Kebutuhan {formatCurrency(target)}</span></div>
                        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg bg-muted/40 p-3 text-xs">
                          <div><p className="text-muted-foreground">Terpakai</p><p className="tabular mt-0.5 font-semibold text-negative">{formatCurrency(spent)}</p></div>
                          <div className="text-right"><p className="text-muted-foreground">Sisa kebutuhan</p><p className="tabular mt-0.5 font-semibold">{formatCurrency(remainingNeedForPost)}</p></div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                          <div className="flex items-center gap-1">
                            <AccountAllocationDialog accounts={accountOptions} allocation={allocation} trigger={<Button variant="ghost" size="sm" disabled={activeAccounts.length === 0} aria-label={`Ubah ${allocation.category?.name ?? "pos"}`}><Pencil className="h-3.5 w-3.5" />Ubah</Button>} />
                            <ConfirmDelete
                              title="Hapus pos?"
                              description="Sisa dana yang masih dicadangkan dilepas menjadi saldo tersedia. Pengeluaran yang sudah tercatat tetap mengurangi saldo akun dan tidak dikembalikan."
                              onConfirm={() => deleteAccountAllocation(allocation.id)}
                              trigger={<Button variant="ghost" size="sm" aria-label={`Hapus ${allocation.category?.name ?? "pos"}`}><Trash2 className="h-3.5 w-3.5" />Hapus</Button>}
                            />
                          </div>
                          {remainingNeedForPost > 0 && account?.is_active ? <FillAllocationButton allocationId={allocation.id} remainingNeed={remainingNeedForPost} /> : <span className="text-xs text-muted-foreground">{remainingNeedForPost > 0 ? "Akun tidak aktif" : "Target terisi"}</span>}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>;
          })}
        </div>
      )}
    </div>
  );
}
