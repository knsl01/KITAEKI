"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { createAccount, deleteAccount, updateAccount } from "@/app/actions/accounts";
import { BrandMarkTile } from "@/components/brand-mark";
import { ConfirmDelete } from "@/components/confirm-delete";
import { BrandPicker } from "@/components/icon-picker";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatCurrency } from "@/lib/format";
import {
  ACCOUNT_TYPE_LABEL,
  OWNER_LABEL,
  type Account,
  type AccountType,
  type MemberOwner,
} from "@/lib/types";

function AccountDialog({ account, trigger }: { account?: Account; trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = account ? await updateAccount(account.id, formData) : await createAccount(formData);
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
          <DialogTitle>{account ? "Ubah akun" : "Tambah akun"}</DialogTitle>
          <DialogDescription>
            Saldo awal jadi titik mulai. Setiap transaksi menyesuaikan saldo secara otomatis.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama akun</Label>
            <Input id="name" name="name" placeholder="BCA, GoPay, Tunai" defaultValue={account?.name} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Jenis</Label>
              <Select id="type" name="type" defaultValue={account?.type ?? "bank"}>
                {(Object.keys(ACCOUNT_TYPE_LABEL) as AccountType[]).map((t) => (
                  <option key={t} value={t}>
                    {ACCOUNT_TYPE_LABEL[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner">Pemilik</Label>
              <Select id="owner" name="owner" defaultValue={account?.owner ?? "shared"}>
                {(Object.keys(OWNER_LABEL) as MemberOwner[]).map((o) => (
                  <option key={o} value={o}>
                    {OWNER_LABEL[o]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <BrandPicker name="icon_key" defaultValue={account?.icon_key} />

          <div className="space-y-2">
            <Label htmlFor="initial_balance">Saldo awal</Label>
            <MoneyInput
              id="initial_balance"
              name="initial_balance"
              allowNegative
              defaultValue={account?.initial_balance ?? 0}
              required
            />
          </div>

          {account ? (
            <div className="space-y-2">
              <Label htmlFor="is_active">Status</Label>
              <Select id="is_active" name="is_active" defaultValue={String(account.is_active)}>
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </Select>
            </div>
          ) : null}

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

export function AccountsClient({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const total = accounts.filter((a) => a.is_active).reduce((sum, a) => sum + Number(a.balance), 0);

  return (
    <div>
      <PageHeader
        title="Akun"
        description="Rekening, e-wallet, dan uang tunai yang kalian pakai."
        action={
          <AccountDialog
            trigger={
              <Button>
                <Plus className="h-4 w-4" />
                Tambah akun
              </Button>
            }
          />
        }
      />

      <Card className="mb-4">
        <CardContent className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Total saldo akun aktif</span>
          <span className="tabular text-2xl font-bold tracking-tight">{formatCurrency(total)}</span>
        </CardContent>
      </Card>

      {accounts.length === 0 ? (
        <Card>
          <EmptyState
            title="Belum ada akun"
            description="Tambah akun pertama supaya transaksi bisa dicatat dan saldonya terhitung."
          />
        </Card>
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <Card
              key={account.id}
              className="card-interactive cursor-pointer p-5"
              onDoubleClick={() => router.push(`/dashboard/accounts/${account.id}`)}
              role="button"
              tabIndex={0}
              aria-label={`Buka detail akun ${account.name}`}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") router.push(`/dashboard/accounts/${account.id}`);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-3">
                  <BrandMarkTile iconKey={account.icon_key} name={account.name} />
                  <div className="min-w-0">
                  <p className="truncate font-medium">{account.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ACCOUNT_TYPE_LABEL[account.type]} · {OWNER_LABEL[account.owner]}
                  </p>
                  </div>
                </div>
                {account.is_active ? null : <Badge>Nonaktif</Badge>}
              </div>

              <p className="tabular mt-5 text-xl font-bold tracking-tight">
                {formatCurrency(Number(account.balance))}
              </p>
              <p className="tabular mt-1 text-xs text-muted-foreground">
                Saldo awal {formatCurrency(Number(account.initial_balance))}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">Klik dua kali untuk melihat detail akun</p>

              <div className="mt-4 flex gap-1 border-t border-border pt-3" onClick={(e) => e.stopPropagation()}>
                <AccountDialog
                  account={account}
                  trigger={
                    <Button variant="ghost" size="sm">
                      <Pencil className="h-3.5 w-3.5" />
                      Ubah
                    </Button>
                  }
                />
                <ConfirmDelete
                  title="Hapus akun?"
                  description="Akun hanya bisa dihapus kalau belum punya transaksi."
                  onConfirm={async () => deleteAccount(account.id)}
                  trigger={
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus
                    </Button>
                  }
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
