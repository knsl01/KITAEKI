"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BrandMarkTile } from "@/components/brand-mark";
import { TransactionAmount } from "@/components/transaction-amount";
import { CategoryIconTile } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  ACCOUNT_TYPE_LABEL,
  OWNER_LABEL,
  TYPE_LABEL,
  type Account,
  type TransactionWithRelations,
} from "@/lib/types";

type Props = {
  account: Account;
  transactions: TransactionWithRelations[];
};

export function AccountDetailClient({ account, transactions }: Props) {
  const router = useRouter();

  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="account-detail-enter">
      {/* Back button */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/accounts")}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Akun
        </Button>
      </div>

      {/* Account header card */}
      <div className="account-detail-card-enter">
        <Card className="mb-6 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <BrandMarkTile iconKey={account.icon_key} name={account.name} size="lg" />
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-bold">{account.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {ACCOUNT_TYPE_LABEL[account.type]} · {OWNER_LABEL[account.owner]}
                </p>
                {!account.is_active && <Badge className="mt-2">Nonaktif</Badge>}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className="tabular mt-1 text-xl font-bold tracking-tight">
                  {formatCurrency(Number(account.balance))}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pemasukan</p>
                <p className="tabular mt-1 text-lg font-semibold text-[hsl(var(--positive))]">
                  +{formatCurrency(income)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pengeluaran</p>
                <p className="tabular mt-1 text-lg font-semibold text-[hsl(var(--negative))]">
                  −{formatCurrency(expense)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions list */}
      <div className="account-detail-list-enter">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Riwayat Transaksi
        </h2>

        {transactions.length === 0 ? (
          <Card>
            <EmptyState
              title="Belum ada transaksi"
              description={`Belum ada transaksi yang tercatat di akun ${account.name}.`}
            />
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-border">
              {transactions.map((t, i) => {
                const category = Array.isArray(t.category) ? t.category[0] : t.category;
                return (
                  <div
                    key={t.id}
                    className="account-detail-row flex items-center gap-3 px-4 py-3 sm:px-5"
                    style={{ animationDelay: `${Math.min(0.2 + i * 0.03, 0.5)}s` }}
                  >
                    {category ? (
                      <CategoryIconTile
                        iconKey={category.icon_key}
                        name={category.name}
                        color={category.color}
                        size="sm"
                      />
                    ) : (
                      <div className="h-8 w-8 shrink-0 rounded-lg bg-muted" />
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {t.description || TYPE_LABEL[t.type]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(t.occurred_on)}
                        {category ? ` · ${category.name}` : ""}
                      </p>
                    </div>

                    <TransactionAmount type={t.type} amount={Number(t.amount)} />
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
