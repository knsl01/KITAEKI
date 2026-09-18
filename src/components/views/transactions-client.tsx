"use client";

import { useMemo, useState } from "react";
import { Pencil, Search, Trash2 } from "lucide-react";
import { CategoryIconTile } from "@/components/brand-mark";
import { ConfirmDelete } from "@/components/confirm-delete";
import { PageHeader } from "@/components/page-header";
import { TransactionAmount } from "@/components/transaction-amount";
import { TransactionDialog } from "@/components/transaction-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteTransaction } from "@/app/actions/transactions";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  OWNER_LABEL,
  TYPE_LABEL,
  type Account,
  type Category,
  type MemberOwner,
  type TransactionType,
  type TransactionWithRelations,
} from "@/lib/types";

type Props = {
  transactions: TransactionWithRelations[];
  accounts: Pick<Account, "id" | "name">[];
  categories: Pick<Category, "id" | "name" | "kind" | "color">[];
};

export function TransactionsClient({ transactions, accounts, categories }: Props) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TransactionType | "">("");
  const [owner, setOwner] = useState<MemberOwner | "">("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (type && t.type !== type) return false;
      if (owner && t.owner !== owner) return false;
      if (accountId && t.account_id !== accountId && t.to_account_id !== accountId) return false;
      if (categoryId && t.category_id !== categoryId) return false;
      if (from && t.occurred_on < from) return false;
      if (to && t.occurred_on > to) return false;
      if (q) {
        const haystack = `${t.description ?? ""} ${t.category?.name ?? ""} ${t.account?.name ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, query, type, owner, accountId, categoryId, from, to]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filtered) {
      if (t.type === "income") income += Number(t.amount);
      if (t.type === "expense") expense += Number(t.amount);
    }
    return { income, expense, net: income - expense };
  }, [filtered]);

  const hasFilter = Boolean(query || type || owner || accountId || categoryId || from || to);

  function resetFilters() {
    setQuery("");
    setType("");
    setOwner("");
    setAccountId("");
    setCategoryId("");
    setFrom("");
    setTo("");
  }

  return (
    <div>
      <PageHeader
        title="Transaksi"
        description="Semua pemasukan, pengeluaran, dan transfer antar akun."
        action={<TransactionDialog accounts={accounts} categories={categories} />}
      />

      <Card className="mb-4">
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari catatan, kategori, atau akun"
              className="pl-9"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Select value={type} onChange={(e) => setType(e.target.value as TransactionType | "")}>
              <option value="">Semua jenis</option>
              {(Object.keys(TYPE_LABEL) as TransactionType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </Select>

            <Select value={owner} onChange={(e) => setOwner(e.target.value as MemberOwner | "")}>
              <option value="">Semua orang</option>
              {(Object.keys(OWNER_LABEL) as MemberOwner[]).map((o) => (
                <option key={o} value={o}>
                  {OWNER_LABEL[o]}
                </option>
              ))}
            </Select>

            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Semua akun</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>

            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Semua kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Dari tanggal" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Sampai tanggal" />
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">{filtered.length} transaksi</span>
            <span className="tabular text-[hsl(var(--positive))]">+ {formatCurrency(totals.income)}</span>
            <span className="tabular text-[hsl(var(--negative))]">− {formatCurrency(totals.expense)}</span>
            <span className="tabular text-muted-foreground">Selisih {formatCurrency(totals.net)}</span>
            {hasFilter ? (
              <Button variant="ghost" size="sm" className="ml-auto" onClick={resetFilters}>
                Reset filter
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            title={hasFilter ? "Tidak ada transaksi yang cocok" : "Belum ada transaksi"}
            description={
              hasFilter
                ? "Ubah atau reset filter untuk melihat catatan lainnya."
                : "Catat transaksi pertama kalian lewat tombol di atas."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Akun</TableHead>
                <TableHead>Milik</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(t.occurred_on)}
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    <p className="truncate">{t.description || TYPE_LABEL[t.type]}</p>
                  </TableCell>
                  <TableCell>
                    {t.category ? (
                      <span className="inline-flex items-center gap-2 text-sm">
                        <CategoryIconTile
                          iconKey={t.category.icon_key}
                          name={t.category.name}
                          color={t.category.color}
                          size="sm"
                        />
                        {t.category.name}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.type === "transfer"
                      ? `${t.account?.name ?? "—"} → ${t.to_account?.name ?? "—"}`
                      : t.account?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge tone="outline">{OWNER_LABEL[t.owner]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <TransactionAmount type={t.type} amount={Number(t.amount)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <TransactionDialog
                        accounts={accounts}
                        categories={categories}
                        transaction={t}
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Ubah transaksi">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <ConfirmDelete
                        title="Hapus transaksi?"
                        description="Saldo akun akan dikembalikan seperti sebelum transaksi ini dicatat."
                        onConfirm={async () => deleteTransaction(t.id)}
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Hapus transaksi">
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
