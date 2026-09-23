"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArrowLeft, Loader2, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { createAccount, deleteAccount, setAccountActive, updateAccount } from "@/app/actions/accounts";
import { deleteAccountAllocation } from "@/app/actions/budgets";
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
import { Progress } from "@/components/ui/progress";
import { AccountAllocationDialog } from "@/components/views/account-allocation-client";
import {
  ACCOUNT_TYPE_LABEL,
  OWNER_LABEL,
  type Account,
  type AccountAllocation,
  type AccountType,
  type MemberOwner,
} from "@/lib/types";

function remainingPercent(remaining: number, original: number) {
  return original > 0 ? Math.max(0, Math.min(100, (remaining / original) * 100)) : 0;
}

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

export function AccountsClient({ accounts, allocations, spentByPost }: { accounts: Account[]; allocations: AccountAllocation[]; spentByPost: Record<string, number> }) {
  const router = useRouter();
  const [showInactive, setShowInactive] = useState(false);
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState("");
  const total = accounts.filter((a) => a.is_active).reduce((sum, a) => sum + Number(a.balance), 0);
  const inactiveCount = accounts.filter((account) => !account.is_active).length;
  const visibleAccounts = accounts.filter((account) => account.is_active !== showInactive);
  const activeAccounts = accounts.filter((account) => account.is_active);
  const activeAccountIds = new Set(activeAccounts.map((account) => account.id));
  const activeAllocations = allocations.filter((allocation) => !allocation.account_id || activeAccountIds.has(allocation.account_id));
  const totalAllocated = activeAllocations.reduce((sum, allocation) => sum + Math.max(Number(allocation.amount) - (spentByPost[allocation.id] ?? 0), 0), 0);
  const available = total - totalAllocated;

  function changeActive(accountId: string, isActive: boolean) {
    setActionError("");
    startTransition(async () => {
      const result = await setAccountActive(accountId, isActive);
      if (!result.ok) { setActionError(result.error); return; }
      router.refresh();
    });
  }

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

      <Card className="mb-5 overflow-hidden"><CardContent className="grid gap-5 p-5 sm:grid-cols-3 sm:p-6">
        <div><p className="text-sm text-muted-foreground">Total saldo</p><p className="tabular mt-1 text-2xl font-bold tracking-tight">{formatCurrency(total)}</p></div>
        <div><p className="text-sm text-muted-foreground">Total anggaran</p><p className="tabular mt-1 text-2xl font-bold tracking-tight text-primary">{formatCurrency(totalAllocated)}</p></div>
        <div><p className="text-sm text-muted-foreground">Saldo tersedia</p><p className={`tabular mt-1 text-2xl font-bold tracking-tight ${available < 0 ? "text-negative" : "text-[hsl(var(--positive))]"}`}>{formatCurrency(available)}</p><p className="mt-1 text-xs text-muted-foreground">Saldo akun dikurangi alokasi pos yang belum terpakai.</p></div>
      </CardContent></Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{showInactive ? "Akun yang disimpan / nonaktif" : "Akun aktif"}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowInactive((value) => !value)}>
          {showInactive ? "Kembali ke akun aktif" : `Lihat akun nonaktif (${inactiveCount})`}
        </Button>
      </div>
      {actionError ? <p role="alert" className="mb-4 rounded-lg bg-negative/10 px-3 py-2 text-sm text-negative">{actionError}</p> : null}

      {allocations.some((allocation) => !allocation.account_id) ? <Card className="mb-4 border-amber-500/30"><CardContent className="p-4"><p className="font-medium">Ada pos lama yang belum terhubung ke akun</p><p className="mt-1 text-sm text-muted-foreground">Pilih akun sumber untuk tiap pos agar saldo tersedia bisa dihitung dengan tepat.</p><div className="mt-3 flex flex-wrap gap-2">{allocations.filter((allocation) => !allocation.account_id).map((allocation) => <div key={allocation.id} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1"><span className="max-w-40 truncate text-sm">{allocation.category?.name ?? "Pos lama"}</span><AccountAllocationDialog accounts={activeAccounts} allocation={allocation} trigger={<Button size="sm" variant="ghost">Pilih akun</Button>} /><ConfirmDelete title="Hapus pos lama?" description="Transaksi yang sudah tercatat tidak dihapus. Nominal alokasi yang belum terpakai dilepas." onConfirm={() => deleteAccountAllocation(allocation.id)} trigger={<Button size="icon" variant="ghost" aria-label="Hapus pos lama"><Trash2 className="h-4 w-4" /></Button>} /></div>)}</div></CardContent></Card> : null}

      {visibleAccounts.length === 0 ? (
        <Card>
          <EmptyState
            title={showInactive ? "Tidak ada akun nonaktif" : "Belum ada akun aktif"}
            description={showInactive ? "Akun yang dinonaktifkan akan muncul di sini dan bisa dipulihkan." : "Tambah akun pertama supaya transaksi bisa dicatat dan saldonya terhitung."}
          />
        </Card>
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleAccounts.map((account) => {
              const accountAllocations = allocations.filter((allocation) => allocation.account_id === account.id);
              return <AccountCard key={account.id} account={account} allocations={accountAllocations} spentByPost={spentByPost} pending={pending} onToggleActive={changeActive} onDelete={deleteAccount} onRefresh={() => router.refresh()} />;
            })}
        </div>
      )}
    </div>
  );
}

function AccountCard({ account, allocations, spentByPost, pending, onToggleActive, onDelete, onRefresh }: {
  account: Account; allocations: AccountAllocation[]; spentByPost: Record<string, number>; pending: boolean;
  onToggleActive: (id: string, active: boolean) => void; onDelete: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>; onRefresh: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const remaining = (allocation: AccountAllocation) => Math.max(Number(allocation.amount) - (spentByPost[allocation.id] ?? 0), 0);
  const remainingTotal = allocations.reduce((sum, allocation) => sum + remaining(allocation), 0);
  const available = Number(account.balance) - remainingTotal;
  const addPos = <AccountAllocationDialog accounts={[account]} fixedAccountId={account.id} trigger={<Button size="sm" disabled={!account.is_active}><Plus className="h-4 w-4" />Tambah pos</Button>} />;
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  return <Card
    className="min-h-[330px] cursor-pointer p-0 [perspective:1200px]"
    onDoubleClick={() => setFlipped((value) => !value)}
    role="button" tabIndex={0} aria-pressed={flipped} aria-label={`${account.name}, klik dua kali untuk ${flipped ? "kembali" : "melihat pos"}`}
    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setFlipped((value) => !value); } }}
  >
    <div className={`account-card-flip-inner relative min-h-[330px] ${flipped ? "is-flipped" : ""}`}>
      <div className="account-card-face absolute inset-0 overflow-auto p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-3"><BrandMarkTile iconKey={account.icon_key} name={account.name} /><div className="min-w-0"><p className="truncate font-medium">{account.name}</p><p className="mt-1 text-xs text-muted-foreground">{ACCOUNT_TYPE_LABEL[account.type]} · {OWNER_LABEL[account.owner]}</p></div></div>
          {account.is_active ? null : <Badge>Nonaktif</Badge>}
        </div>
        <p className="tabular mt-5 text-2xl font-bold tracking-tight">{formatCurrency(Number(account.balance))}</p>
        <p className="tabular mt-1 text-xs text-muted-foreground">Saldo awal {formatCurrency(Number(account.initial_balance))}</p>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2"><span className="text-xs text-muted-foreground">Pos aktif</span><span className="tabular text-sm font-semibold">{allocations.length} · {formatCurrency(remainingTotal)}</span></div>
        <p className="mt-2 text-xs text-muted-foreground">Saldo tersedia akun {formatCurrency(available)} · klik dua kali untuk ringkasan pos</p>
        <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-border pt-3" onClick={stop} onDoubleClick={stop}>
          {addPos}
          <AccountDialog account={account} trigger={<Button variant="ghost" size="sm"><Pencil className="h-3.5 w-3.5" />Ubah</Button>} />
          {account.is_active ? <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => onToggleActive(account.id, false)}>{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}Nonaktifkan</Button> : <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => onToggleActive(account.id, true)}>{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}Pulihkan</Button>}
          {account.is_active ? <ConfirmDelete title="Hapus akun?" description="Akun yang memiliki riwayat atau pos akan diarsipkan agar datanya tetap aman." onConfirm={() => onDelete(account.id)} trigger={<Button variant="ghost" size="sm" className="text-muted-foreground"><Trash2 className="h-3.5 w-3.5" />Hapus</Button>} /> : null}
        </div>
      </div>
      <div className="account-card-face account-card-back absolute inset-0 overflow-auto p-5" aria-hidden={!flipped}>
        <div className="flex items-center justify-between"><div><p className="text-sm font-semibold">Ringkasan pos</p><p className="text-xs text-muted-foreground">{account.name} · sisa anggaran tiap pos</p></div><Button variant="ghost" size="icon" aria-label="Kembali ke akun" onClick={(event) => { stop(event); setFlipped(false); }}><ArrowLeft className="h-4 w-4" /></Button></div>
        <div className="my-3 grid grid-cols-2 gap-2"><div className="rounded-lg bg-muted/60 p-2.5"><p className="text-[11px] text-muted-foreground">Total pos tersisa</p><p className="tabular mt-1 text-sm font-semibold">{formatCurrency(remainingTotal)}</p></div><div className="rounded-lg bg-muted/60 p-2.5"><p className="text-[11px] text-muted-foreground">Saldo tersedia</p><p className="tabular mt-1 text-sm font-semibold">{formatCurrency(available)}</p></div></div>
        <div className="space-y-3">{allocations.length ? allocations.map((allocation) => {
          const used = spentByPost[allocation.id] ?? 0; const balance = remaining(allocation); const original = Number(allocation.amount);
          return <div key={allocation.id} className="rounded-lg border border-border/70 p-2.5"><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{allocation.category?.name ?? "Pos"}</span><span className="tabular shrink-0 text-xs font-semibold">{formatCurrency(balance)}</span></div><Progress value={remainingPercent(balance, original)} className="mt-2 h-1.5" /><div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground"><span>{remainingPercent(balance, original).toFixed(1)}% tersisa</span><span>Budget {formatCurrency(original)} · terpakai {formatCurrency(used)}</span></div><div className="mt-1 flex justify-end gap-1" onClick={stop} onDoubleClick={stop}><AccountAllocationDialog accounts={[account]} fixedAccountId={account.id} allocation={allocation} trigger={<Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Edit ${allocation.category?.name}`}><Pencil className="h-3.5 w-3.5" /></Button>} /><ConfirmDelete title="Hapus pos?" description="Transaksi tetap tersimpan; sisa budget akan kembali menjadi saldo tersedia." onConfirm={async () => { const result = await deleteAccountAllocation(allocation.id); if (result.ok) onRefresh(); return result; }} trigger={<Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Hapus ${allocation.category?.name}`}><Trash2 className="h-3.5 w-3.5" /></Button>} /></div></div>;
        }) : <EmptyState title="Belum ada pos" description="Tambah pos untuk mengalokasikan sebagian saldo akun ini." />}</div>
        <div className="mt-3 flex justify-end" onClick={stop} onDoubleClick={stop}>{addPos}</div>
      </div>
    </div>
  </Card>;
}
