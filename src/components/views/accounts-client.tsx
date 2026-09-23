"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive, ArrowLeft, Loader2, Pencil, PiggyBank, Plus, RotateCcw, Trash2 } from "lucide-react";
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
import { accountLogoFor, brandFor } from "@/lib/icons";
import {
  ACCOUNT_TYPE_LABEL,
  OWNER_LABEL,
  type Account,
  type AccountAllocation,
  type AccountType,
  type MemberOwner,
} from "@/lib/types";

function filledPercent(allocated: number, target: number) {
  return target > 0 ? Math.min(100, Math.max(0, (allocated / target) * 100)) : 0;
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

export function AccountsClient({ accounts, allocations }: { accounts: Account[]; allocations: AccountAllocation[] }) {
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
  const totalAllocated = activeAllocations.reduce((sum, allocation) => sum + Number(allocation.allocated_amount), 0);
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
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href="/dashboard/budget"><PiggyBank className="h-4 w-4" />Anggaran</Link></Button>
            <AccountDialog trigger={<Button><Plus className="h-4 w-4" />Tambah akun</Button>} />
          </div>
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
        <div className="account-card-grid stagger">
            {visibleAccounts.map((account) => {
              const accountAllocations = allocations.filter((allocation) => allocation.account_id === account.id);
              return <AccountCard key={account.id} account={account} allocations={accountAllocations} pending={pending} onToggleActive={changeActive} onDelete={deleteAccount} />;
            })}
        </div>
      )}
    </div>
  );
}

function AccountCard({ account, allocations, pending, onToggleActive, onDelete }: {
  account: Account; allocations: AccountAllocation[]; pending: boolean;
  onToggleActive: (id: string, active: boolean) => void; onDelete: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const router = useRouter();
  const [flipped, setFlipped] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (clickTimer.current) clearTimeout(clickTimer.current); }, []);
  const allocatedTotal = allocations.reduce((sum, allocation) => sum + Number(allocation.allocated_amount), 0);
  const targetTotal = allocations.reduce((sum, allocation) => sum + Number(allocation.target_amount), 0);
  const spentTotal = allocations.reduce((sum, allocation) => sum + Number(allocation.spent_amount), 0);
  const usagePercent = filledPercent(allocatedTotal, targetTotal);
  const available = Number(account.balance) - allocatedTotal;
  const accountLogo = accountLogoFor(account.icon_key, account.name);
  const brand = brandFor(account.icon_key, account.name);
  const BrandIcon = brand.icon;
  const addPos = <AccountAllocationDialog accounts={[account]} fixedAccountId={account.id} trigger={<Button className="w-full" disabled={!account.is_active}><Plus className="h-4 w-4" />Tambah pos</Button>} />;
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();
  const destination = `/dashboard/accounts/${account.id}`;

  function handleCardClick(event: React.MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("[data-account-card-action]")) return;
    // Use the click sequence itself instead of onDoubleClick: mobile browsers
    // don't consistently emit dblclick for touch, but do emit click for each tap.
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      setFlipped((value) => !value);
      return;
    }
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      router.push(destination);
    }, 320);
  }

  return <div
    className="account-card-shell relative cursor-pointer select-none text-card-foreground"
    onClick={handleCardClick}
    role="link" tabIndex={0} aria-label={`${account.name}. Ketuk sekali untuk membuka daftar pos, dua kali untuk ringkasan singkat.`}
    onKeyDown={(event) => {
      if ((event.target as HTMLElement).closest("[data-account-card-action]")) return;
      if (event.key === "Enter") {
        event.preventDefault();
        if (clickTimer.current) clearTimeout(clickTimer.current);
        clickTimer.current = null;
        router.push(destination);
      }
      if (event.key === " ") {
        event.preventDefault();
        if (clickTimer.current) clearTimeout(clickTimer.current);
        clickTimer.current = null;
        setFlipped((value) => !value);
      }
    }}
  >
    <div className={`account-card-flip-inner relative ${flipped ? "is-flipped" : ""}`}>
      <div className="account-card-face account-card-front overflow-hidden rounded-lg bg-card">
        {accountLogo ? <div aria-hidden className="pointer-events-none absolute -right-12 top-12 z-0 h-60 w-60 select-none opacity-[0.07] blur-[1.5px] mix-blend-soft-light md:-right-14 md:top-14 md:h-72 md:w-72">
          {logoFailed ? <div className="relative flex h-full w-full items-center justify-center text-muted-foreground"><BrandIcon className="h-3/4 w-3/4" strokeWidth={1} /><span className="absolute text-3xl font-black tracking-tight">{brand.short}</span></div> : <Image src={accountLogo} alt="" fill sizes="(max-width: 767px) 240px, 288px" className="object-contain" onError={() => setLogoFailed(true)} />}
        </div> : null}

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {accountLogo && !logoFailed ? <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-muted/40 md:h-14 md:w-14">
              <Image src={accountLogo} alt={`${account.name} logo`} fill sizes="(max-width: 767px) 48px, 56px" className="object-contain" onError={() => setLogoFailed(true)} />
            </span> : accountLogo ? <span aria-hidden className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/40 text-xs font-semibold text-muted-foreground md:h-14 md:w-14">{brand.short}</span> : <BrandMarkTile iconKey={account.icon_key} name={account.name} className="h-12 w-12 rounded-xl text-sm md:h-14 md:w-14" />}
            <div className="min-w-0">
              <p className="truncate text-base font-semibold tracking-tight">{account.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{ACCOUNT_TYPE_LABEL[account.type]} · {OWNER_LABEL[account.owner]}</p>
            </div>
          </div>
          <div data-account-card-action onClick={stop} onDoubleClick={stop} className="relative z-10 flex items-center gap-1">
            {!account.is_active ? <Badge>Nonaktif</Badge> : null}
            <AccountDialog account={account} trigger={<Button variant="ghost" size="icon" aria-label={`Ubah akun ${account.name}`}><Pencil className="h-4 w-4" /></Button>} />
          </div>
        </div>

        <div className="account-card-balance relative z-10">
          <p className="text-xs text-muted-foreground">Saldo saat ini</p>
          <p className="tabular mt-1 break-words text-3xl font-bold tracking-tight sm:text-[2rem]">{formatCurrency(Number(account.balance))}</p>
          <p className="tabular mt-1 text-xs text-muted-foreground">Saldo awal {formatCurrency(Number(account.initial_balance))}</p>
        </div>

        <div className="account-card-budget relative z-10 rounded-xl border border-border/70 bg-muted/40 p-3">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs text-muted-foreground">Pos aktif</p><p className="mt-0.5 text-sm font-semibold">{allocations.length} pos</p></div>
            <div className="text-right"><p className="text-xs text-muted-foreground">Masih dicadangkan</p><p className="tabular mt-0.5 text-sm font-semibold">{formatCurrency(allocatedTotal)}</p></div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">Pemenuhan target</span>
            <span className="tabular font-semibold">{usagePercent.toFixed(1)}% terisi</span>
          </div>
          <Progress value={usagePercent} className="mt-2 h-2" />
          <p className="mt-1 text-[11px] text-muted-foreground">Pengeluaran dari pos {formatCurrency(spentTotal)}</p>
        </div>

        <div className="account-card-metrics relative z-10 grid grid-cols-2 gap-3">
          <div><p className="text-xs text-muted-foreground">Saldo tersedia</p><p className="tabular mt-1 break-words text-base font-semibold">{formatCurrency(available)}</p></div>
          <div className="border-l border-border pl-3 text-right"><p className="text-xs text-muted-foreground">Dialokasikan</p><p className="tabular mt-1 break-words text-base font-semibold">{formatCurrency(allocatedTotal)}</p></div>
        </div>

        <div data-account-card-action onClick={stop} onDoubleClick={stop} className="account-card-actions relative z-10 grid grid-cols-2 gap-2">
          {addPos}
          <Button asChild variant="outline" className="w-full"><Link href={destination}>Kelola <ArrowLeft className="h-4 w-4 rotate-180" /></Link></Button>
        </div>

        <div data-account-card-action onClick={stop} onDoubleClick={stop} className="account-card-utilities relative z-10 flex items-center justify-between gap-2 border-t border-border pt-3">
          {account.is_active ? <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => onToggleActive(account.id, false)}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}Nonaktifkan</Button> : <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => onToggleActive(account.id, true)}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}Pulihkan</Button>}
          <ConfirmDelete title="Hapus akun dan riwayatnya?" description="Akun ini, semua transaksi yang melibatkan akun ini (termasuk transfer), pos, dan transaksi berulang akan dihapus permanen. Tindakan ini tidak bisa dibatalkan." onConfirm={() => onDelete(account.id)} trigger={<Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" />Hapus</Button>} />
        </div>
      </div>

      <div className="account-card-face account-card-back absolute inset-0 overflow-hidden rounded-lg bg-card" aria-hidden={!flipped}>
        <div className="flex items-center justify-between"><div><p className="text-sm font-semibold">Ringkasan pos</p><p className="text-xs text-muted-foreground">{account.name} · persentase pemakaian</p></div><Button variant="ghost" size="icon" aria-label="Kembali ke akun" onClick={(event) => { stop(event); setFlipped(false); }}><ArrowLeft className="h-4 w-4" /></Button></div>
        <div className="my-3 grid grid-cols-2 gap-2"><div className="rounded-lg bg-muted/60 p-2.5"><p className="text-[11px] text-muted-foreground">Masih dicadangkan</p><p className="tabular mt-1 text-sm font-semibold">{formatCurrency(allocatedTotal)}</p></div><div className="rounded-lg bg-muted/60 p-2.5"><p className="text-[11px] text-muted-foreground">Saldo tersedia</p><p className="tabular mt-1 text-sm font-semibold">{formatCurrency(available)}</p></div></div>
        <div className="space-y-2">{allocations.length ? allocations.slice(0, 3).map((allocation) => {
          const spent = Number(allocation.spent_amount); const allocated = Number(allocation.allocated_amount); const target = Number(allocation.target_amount); const percent = filledPercent(allocated, target);
          return <div key={allocation.id} className="rounded-lg border border-border/70 px-2.5 py-2"><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{allocation.category?.name ?? "Pos"}</span><span className="tabular shrink-0 text-xs font-semibold">{formatCurrency(allocated)} terisi</span></div><Progress value={percent} className="mt-1.5 h-1.5" /><div className="mt-1 text-[10px] text-muted-foreground">{percent.toFixed(1)}% · target {formatCurrency(target)} · terpakai {formatCurrency(spent)}</div></div>;
        }) : <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">Belum ada pos. Tambahkan pos melalui kartu akun.</p>}</div>
        {allocations.length > 3 ? <p className="mt-2 text-xs text-muted-foreground">+{allocations.length - 3} pos lainnya</p> : null}
        <div data-account-card-action onClick={stop} onDoubleClick={stop} className="mt-3 flex justify-end"><Button asChild size="sm" variant="outline"><Link href={destination}>Kelola semua pos <ArrowLeft className="h-3.5 w-3.5 rotate-180" /></Link></Button></div>
      </div>
    </div>
  </div>;
}
