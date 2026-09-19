"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createRecurring,
  deleteRecurring,
  runRecurringNow,
  toggleRecurring,
  updateRecurring,
} from "@/app/actions/recurring";
import { ConfirmDelete } from "@/components/confirm-delete";
import { PageHeader } from "@/components/page-header";
import { TransactionAmount } from "@/components/transaction-amount";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import {
  FREQUENCY_LABEL,
  OWNER_LABEL,
  TYPE_LABEL,
  type Account,
  type Category,
  type MemberOwner,
  type RecurringFrequency,
  type RecurringTransaction,
  type TransactionType,
} from "@/lib/types";

type Props = {
  items: RecurringTransaction[];
  accounts: Pick<Account, "id" | "name">[];
  categories: Pick<Category, "id" | "name" | "kind">[];
};

type RecurringDialogProps = {
  item?: RecurringTransaction;
  accounts: Pick<Account, "id" | "name">[];
  categories: Pick<Category, "id" | "name" | "kind">[];
  trigger: React.ReactNode;
};

function RecurringDialog({ item, accounts, categories, trigger }: RecurringDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>(item?.type ?? "expense");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visibleCategories = categories.filter((c) =>
    type === "income" ? c.kind === "income" : c.kind === "expense"
  );

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = item ? await updateRecurring(item.id, formData) : await createRecurring(formData);
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Ubah transaksi berulang" : "Tambah transaksi berulang"}</DialogTitle>
          <DialogDescription>
            Tagihan rutin seperti listrik atau langganan. Catat jadi transaksi saat jatuh tempo lewat tombol Catat.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="space-y-4">
          <input type="hidden" name="type" value={type} />

          <div className="grid grid-cols-3 gap-2">
            {(["expense", "income", "transfer"] as TransactionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={
                  type === t
                    ? "rounded-md border border-primary bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                }
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Nama tagihan</Label>
            <Input id="description" name="description" placeholder="Listrik PLN" defaultValue={item?.description ?? ""} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Nominal</Label>
              <MoneyInput id="amount" name="amount" min={1} placeholder="150.000" defaultValue={item?.amount ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency">Frekuensi</Label>
              <Select id="frequency" name="frequency" defaultValue={item?.frequency ?? "monthly"}>
                {(Object.keys(FREQUENCY_LABEL) as RecurringFrequency[]).map((f) => (
                  <option key={f} value={f}>
                    {FREQUENCY_LABEL[f]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="next_run_on">Jatuh tempo berikutnya</Label>
              <Input
                id="next_run_on"
                name="next_run_on"
                type="date"
                defaultValue={item?.next_run_on ?? new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner">Milik</Label>
              <Select id="owner" name="owner" defaultValue={item?.owner ?? "shared"}>
                {(Object.keys(OWNER_LABEL) as MemberOwner[]).map((o) => (
                  <option key={o} value={o}>
                    {OWNER_LABEL[o]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="account_id">{type === "transfer" ? "Dari akun" : "Akun"}</Label>
              <Select id="account_id" name="account_id" defaultValue={item?.account_id ?? ""} required>
                <option value="">Pilih akun</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </div>

            {type === "transfer" ? (
              <div className="space-y-2">
                <Label htmlFor="to_account_id">Ke akun</Label>
                <Select id="to_account_id" name="to_account_id" defaultValue={item?.to_account_id ?? ""} required>
                  <option value="">Pilih akun tujuan</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="category_id">Kategori</Label>
                <Select id="category_id" name="category_id" defaultValue={item?.category_id ?? ""}>
                  <option value="">Tanpa kategori</option>
                  {visibleCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RecurringClient({ items, accounts, categories }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title="Transaksi berulang"
        description="Tagihan dan pemasukan rutin yang jatuh tempo tiap periode."
        action={
          <RecurringDialog
            accounts={accounts}
            categories={categories}
            trigger={
              <Button>
                <Plus className="h-4 w-4" />
                Tambah berulang
              </Button>
            }
          />
        }
      />

      {items.length === 0 ? (
        <Card>
          <EmptyState
            title="Belum ada transaksi berulang"
            description="Tambahkan tagihan rutin seperti listrik, internet, atau cicilan."
          />
        </Card>
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const due = item.next_run_on <= today;
            return (
              <Card key={item.id} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.description || TYPE_LABEL[item.type]}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {FREQUENCY_LABEL[item.frequency]} · {item.account?.name ?? "—"} · {OWNER_LABEL[item.owner]}
                    </p>
                  </div>
                  {item.is_active ? (
                    due ? (
                      <Badge tone="negative">Jatuh tempo</Badge>
                    ) : null
                  ) : (
                    <Badge>Nonaktif</Badge>
                  )}
                </div>

                <div className="mt-4">
                  <TransactionAmount type={item.type} amount={Number(item.amount)} className="text-lg" />
                  <p className="mt-1 text-xs text-muted-foreground">Berikutnya {formatDate(item.next_run_on)}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-1 border-t border-border pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending || !item.is_active}
                    onClick={() =>
                      startTransition(async () => {
                        await runRecurringNow(item.id);
                        router.refresh();
                      })
                    }
                  >
                    <Check className="h-3.5 w-3.5" />
                    Catat
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await toggleRecurring(item.id, !item.is_active);
                        router.refresh();
                      })
                    }
                  >
                    {item.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                  <RecurringDialog
                    item={item}
                    accounts={accounts}
                    categories={categories}
                    trigger={
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-3.5 w-3.5" />
                        Ubah
                      </Button>
                    }
                  />
                  <ConfirmDelete
                    title="Hapus transaksi berulang?"
                    onConfirm={async () => deleteRecurring(item.id)}
                    trigger={
                      <Button variant="ghost" size="sm" className="text-muted-foreground">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
