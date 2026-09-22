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
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  OWNER_LABEL,
  TYPE_LABEL,
  type Account,
  type Budget,
  type Category,
  type MemberOwner,
  type Transaction,
  type TransactionType,
} from "@/lib/types";

type BudgetPost = Pick<Budget, "id" | "category_id"> & {
  category?: Pick<Category, "id" | "name"> | null;
};

type Props = {
  accounts: Pick<Account, "id" | "name">[];
  categories: Pick<Category, "id" | "name" | "kind">[];
  budgets?: BudgetPost[];
  transaction?: Transaction;
  defaultOwner?: MemberOwner;
  trigger?: React.ReactNode;
};

const TYPES: TransactionType[] = ["expense", "income", "transfer"];
const LAINNYA_VALUE = "__lainnya__";

export function TransactionDialog({
  accounts,
  categories,
  budgets = [],
  transaction,
  defaultOwner = "shared",
  trigger,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>(transaction?.type ?? "expense");
  const [selectedAccountId, setSelectedAccountId] = useState(transaction?.account_id ?? "");
  const [selectedBudgetId, setSelectedBudgetId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(transaction?.category_id ?? "");
  const [isLainnya, setIsLainnya] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visibleCategories = useMemo(
    () => categories.filter((c) => (type === "income" ? c.kind === "income" : c.kind === "expense")),
    [categories, type]
  );

  const isEdit = Boolean(transaction);
  const today = new Date().toISOString().slice(0, 10);

  function handleBudgetChange(budgetId: string) {
    setSelectedBudgetId(budgetId);
    if (budgetId) {
      const budget = budgets.find((b) => b.id === budgetId);
      if (budget?.category_id) {
        setSelectedCategoryId(budget.category_id);
        setIsLainnya(false);
        setCustomCategory("");
      }
    }
  }

  function handleCategoryChange(value: string) {
    if (value === LAINNYA_VALUE) {
      setIsLainnya(true);
      setSelectedCategoryId("");
      setCustomCategory("");
    } else {
      setIsLainnya(false);
      setSelectedCategoryId(value);
      setCustomCategory("");
    }
  }

  function onSubmit(formData: FormData) {
    setError(null);
    // If custom category, append it to the form
    if (isLainnya && customCategory.trim()) {
      formData.set("custom_category", customCategory.trim());
      formData.delete("category_id");
    }
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

  function resetState() {
    setType(transaction?.type ?? "expense");
    setSelectedAccountId(transaction?.account_id ?? "");
    setSelectedBudgetId("");
    setSelectedCategoryId(transaction?.category_id ?? "");
    setIsLainnya(false);
    setCustomCategory("");
    setError(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetState();
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
              Belum ada akun. Buat akun dulu di halaman Akun supaya transaksi bisa dicatat.
            </p>
            <Button onClick={() => router.push("/dashboard/accounts")}>Buka Akun</Button>
          </div>
        ) : (
          <form action={onSubmit} className="space-y-4">
            <input type="hidden" name="type" value={type} />

            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t);
                    setSelectedBudgetId("");
                    setIsLainnya(false);
                    setCustomCategory("");
                  }}
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
              <MoneyInput
                id="amount"
                name="amount"
                min={1}
                placeholder="50.000"
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
                <Select
                  id="account_id"
                  name="account_id"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  required
                >
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
              ) : null}
            </div>

            {/* Pos Anggaran - muncul saat pengeluaran */}
            {type === "expense" && selectedAccountId && budgets.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="budget_id">Pos Anggaran <span className="text-muted-foreground font-normal">(opsional)</span></Label>
                <Select
                  id="budget_id"
                  name="budget_id"
                  value={selectedBudgetId}
                  onChange={(e) => handleBudgetChange(e.target.value)}
                >
                  <option value="">Tanpa pos anggaran</option>
                  {budgets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.category?.name ?? "Pos tanpa kategori"}
                    </option>
                  ))}
                </Select>
                {selectedBudgetId && (
                  <p className="text-xs text-muted-foreground">
                    Kategori otomatis disesuaikan dengan pos anggaran.
                  </p>
                )}
              </div>
            )}

            {type !== "transfer" && (
              <div className="space-y-2">
                <Label htmlFor="category_id">Kategori</Label>
                <Select
                  id="category_id"
                  name="category_id"
                  value={isLainnya ? LAINNYA_VALUE : selectedCategoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                >
                  <option value="">Tanpa kategori</option>
                  {visibleCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value={LAINNYA_VALUE}>Lainnya (ketik sendiri)</option>
                </Select>
                {isLainnya && (
                  <Input
                    name="custom_category"
                    placeholder="Ketik nama kategori..."
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="mt-2"
                    autoFocus
                  />
                )}
                {type === "expense" && selectedAccountId && !selectedBudgetId && (
                  <p className="text-xs text-muted-foreground">Pilih kategori sendiri, atau pilih pos anggaran di atas untuk mengisinya otomatis.</p>
                )}
              </div>
            )}

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
