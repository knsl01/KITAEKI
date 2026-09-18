"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { createTransaction, updateTransaction } from "@/app/actions/transactions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  OWNER_LABEL,
  TYPE_LABEL,
  type Account,
  type Category,
  type MemberOwner,
  type Transaction,
  type TransactionType,
} from "@/lib/types";

type Props = {
  accounts: Pick<Account, "id" | "name">[];
  categories: Pick<Category, "id" | "name" | "kind">[];
  transaction?: Transaction;
  defaultOwner?: MemberOwner;
  trigger?: React.ReactNode;
};

const TYPES: TransactionType[] = ["expense", "income", "transfer"];

export function TransactionDialog({ accounts, categories, transaction, defaultOwner = "shared", trigger }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>(transaction?.type ?? "expense");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visibleCategories = useMemo(
    () => categories.filter((c) => (type === "income" ? c.kind === "income" : c.kind === "expense")),
    [categories, type]
  );

  const isEdit = Boolean(transaction);
  const today = new Date().toISOString().slice(0, 10);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateTransaction(transaction!.id, formData)
        : await createTransaction(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setType(transaction?.type ?? "expense");
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" />
            Tambah transaksi
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah transaksi" : "Tambah transaksi"}</DialogTitle>
          <DialogDescription>
            Saldo akun langsung menyesuaikan setelah transaksi disimpan.
          </DialogDescription>
        </DialogHeader>

        {accounts.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Belum ada akun. Buat akun dulu di halaman Akun &amp; Saldo supaya transaksi bisa dicatat.
            </p>
            <Button onClick={() => router.push("/dashboard/accounts")}>Buka Akun &amp; Saldo</Button>
          </div>
        ) : (
          <form action={onSubmit} className="space-y-4">
            <input type="hidden" name="type" value={type} />

            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm transition-colors",
                    type === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Nominal</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min={1}
                step="1"
                inputMode="numeric"
                placeholder="50000"
                defaultValue={transaction?.amount ?? ""}
                required
                autoFocus
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="occurred_on">Tanggal</Label>
                <Input
                  id="occurred_on"
                  name="occurred_on"
                  type="date"
                  defaultValue={transaction?.occurred_on ?? today}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner">Milik</Label>
                <Select id="owner" name="owner" defaultValue={transaction?.owner ?? defaultOwner}>
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
                <Select id="account_id" name="account_id" defaultValue={transaction?.account_id ?? ""} required>
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
                  <Select
                    id="to_account_id"
                    name="to_account_id"
                    defaultValue={transaction?.to_account_id ?? ""}
                    required
                  >
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
                  <Select id="category_id" name="category_id" defaultValue={transaction?.category_id ?? ""}>
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

            <div className="space-y-2">
              <Label htmlFor="description">Catatan</Label>
              <Textarea
                id="description"
                name="description"
                rows={2}
                placeholder="Makan siang, belanja bulanan, dll."
                defaultValue={transaction?.description ?? ""}
              />
            </div>

            {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isEdit ? "Simpan perubahan" : "Simpan transaksi"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
