"use client";

import Link from "next/link";
import { ArrowRight, Landmark } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/format";
import type { AccountAllocation, Category, Transaction } from "@/lib/types";

type Props = {
  /** Diterima untuk kompatibilitas dengan halaman lama; Pos tidak lagi bulanan. */
  month?: string;
  budgets: AccountAllocation[];
  categories?: Category[];
  transactions?: Pick<Transaction, "amount" | "type" | "category_id">[];
};

function fillPercent(allocated: number, target: number) {
  return target > 0 ? Math.min(100, Math.max(0, (allocated / target) * 100)) : 0;
}

export function BudgetClient({ budgets }: Props) {
  const totalTarget = budgets.reduce((sum, post) => sum + Number(post.target_amount), 0);
  const totalAllocated = budgets.reduce((sum, post) => sum + Number(post.allocated_amount), 0);
  const totalSpent = budgets.reduce((sum, post) => sum + Number(post.spent_amount), 0);
  const totalNeed = budgets.reduce((sum, post) => sum + Math.max(Number(post.target_amount) - Number(post.allocated_amount), 0), 0);

  return (
    <div>
      <PageHeader
        title="Pos Anggaran"
        description="Lihat target kebutuhan, dana yang dicadangkan, dan pengeluaran aktual."
        action={<Button asChild><Link href="/dashboard/accounts">Kelola di Akun<ArrowRight className="h-4 w-4" /></Link></Button>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total target semua Pos</p><p className="tabular mt-1 text-xl font-bold">{formatCurrency(totalTarget)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Sudah dialokasikan</p><p className="tabular mt-1 text-xl font-bold">{formatCurrency(totalAllocated)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Masih dibutuhkan untuk melengkapi Pos</p><p className="tabular mt-1 text-xl font-bold text-primary">{formatCurrency(totalNeed)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pengeluaran aktual</p><p className="tabular mt-1 text-xl font-bold text-negative">{formatCurrency(totalSpent)}</p></CardContent></Card>
      </div>

      {budgets.length === 0 ? (
        <Card><EmptyState title="Belum ada Pos" description="Pos dibuat dari kartu akun. Buka Akun untuk menambah kebutuhan dan memilih sumber dananya." action={<Button asChild><Link href="/dashboard/accounts">Buka Akun<ArrowRight className="h-4 w-4" /></Link></Button>} /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {budgets.map((post) => {
            const target = Number(post.target_amount);
            const allocated = Number(post.allocated_amount);
            const spent = Number(post.spent_amount);
            const percent = fillPercent(allocated, target);
            return (
              <Card key={post.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><h2 className="truncate font-semibold">{post.category?.name ?? "Pos"}</h2><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Landmark className="h-3.5 w-3.5" />{post.account?.name ?? "Pilih akun sumber di Akun"}</p></div>
                    <span className="tabular shrink-0 text-sm font-semibold">{formatCurrency(allocated)}</span>
                  </div>
                  <Progress value={percent} className="mt-4 h-2" />
                  <p className="mt-2 text-xs text-muted-foreground">{percent.toFixed(1)}% terisi dari kebutuhan {formatCurrency(target)}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 text-xs">
                    <div><p className="text-muted-foreground">Terpakai</p><p className="tabular mt-1 font-semibold text-negative">{formatCurrency(spent)}</p></div>
                    <div className="text-right"><p className="text-muted-foreground">Sisa kebutuhan</p><p className="tabular mt-1 font-semibold">{formatCurrency(Math.max(target - allocated, 0))}</p></div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {budgets.length > 0 ? <p className="mt-4 text-xs text-muted-foreground">“Masih dibutuhkan” adalah jumlah sisa target Pos setelah dikurangi dana yang sudah dialokasikan; pengeluaran aktual ditampilkan terpisah. Pos tidak direset per bulan.</p> : null}
    </div>
  );
}
