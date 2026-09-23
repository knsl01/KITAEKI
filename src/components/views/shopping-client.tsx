"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, MoreHorizontal, Pencil, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { clearBoughtShopping, createShoppingItem, deleteShoppingItem, toggleShoppingItem, updateShoppingItem } from "@/app/actions/shopping";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { CheckButton, useAction } from "@/components/views/life-shared";
import { ConfirmDelete } from "@/components/confirm-delete";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/format";
import { OWNER_LABEL, type MemberOwner, type ShoppingItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "open" | "done";

export function ShoppingClient({ items }: { items: ShoppingItem[] }) {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<ShoppingItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { run, pending, error } = useAction();
  const [deleting, startDelete] = useTransition();
  const openItems = items.filter((item) => !item.is_bought);
  const boughtItems = items.filter((item) => item.is_bought);
  const estimate = items.reduce((sum, item) => sum + Number(item.estimated_price ?? 0), 0);
  const openEstimate = openItems.reduce((sum, item) => sum + Number(item.estimated_price ?? 0), 0);
  const boughtEstimate = boughtItems.reduce((sum, item) => sum + Number(item.estimated_price ?? 0), 0);

  function openCreate() {
    setEditingItem(null);
    setEditorOpen(true);
  }

  function openEdit(item: ShoppingItem) {
    setEditingItem(item);
    setEditorOpen(true);
  }

  function confirmDelete() {
    if (!deletingItem) return;
    const item = deletingItem;
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteShoppingItem(item.id);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      setDeletingItem(null);
    });
  }

  const showOpen = filter !== "done";
  const showBought = filter !== "open";

  return (
    <div>
      <PageHeader
        title="Belanja"
        description="Daftar barang yang mau kamu beli."
        action={<Button size="lg" onClick={openCreate}><Plus className="h-4 w-4" />Tambah Barang</Button>}
      />

      <section aria-label="Ringkasan daftar belanja" className="mb-6 grid grid-cols-3 divide-x divide-border rounded-xl border border-border/70 bg-card/60 py-3">
        <div className="px-3 text-center sm:px-5"><p className="tabular text-lg font-semibold leading-tight">{items.length}</p><p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">Barang</p></div>
        <div className="px-3 text-center sm:px-5"><p className="tabular text-lg font-semibold leading-tight">{boughtItems.length}</p><p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">Selesai</p></div>
        <div className="px-3 text-center sm:px-5"><p className="tabular text-base font-semibold leading-tight sm:text-lg">{formatCurrency(estimate)}</p><p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">Estimasi total</p></div>
      </section>

      <nav aria-label="Filter daftar belanja" className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-muted/65 p-1 sm:inline-flex sm:rounded-full">
        {([
          ["all", "Semua", items.length],
          ["open", "Belum dibeli", openItems.length],
          ["done", "Selesai", boughtItems.length],
        ] as const).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={cn(
              "flex h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:rounded-full sm:text-sm",
              filter === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}<span className="tabular text-[10px] text-muted-foreground sm:text-xs">{count}</span>
          </button>
        ))}
      </nav>

      {error ? <p role="alert" className="mb-3 rounded-md bg-negative/10 px-3 py-2 text-sm text-negative">{error}</p> : null}
      {deletingItem && deleting ? <p role="status" className="mb-3 text-sm text-muted-foreground">Menghapus barang…</p> : null}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-5 py-14 text-center">
          <ShoppingBasket className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden />
          <h2 className="mt-3 font-serif text-lg">Belum ada daftar belanja</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Tambahkan barang yang ingin kamu beli sebelum pergi belanja.</p>
          <Button size="lg" className="mt-4" onClick={openCreate}><Plus className="h-4 w-4" />Tambah Barang</Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
          {showOpen ? <ShoppingSection
            title="Belum dibeli"
            items={openItems}
            emptyText={openItems.length === 0 ? "Semua barang sudah dibeli." : undefined}
            pending={pending || deleting}
            onToggle={(item) => run(() => toggleShoppingItem(item.id, true))}
            onEdit={openEdit}
            onDelete={setDeletingItem}
          /> : null}
          {showBought ? <ShoppingSection
            title="Sudah dibeli"
            items={boughtItems}
            emptyText={boughtItems.length === 0 ? "Belum ada barang yang selesai dibeli." : undefined}
            pending={pending || deleting}
            onToggle={(item) => run(() => toggleShoppingItem(item.id, false))}
            onEdit={openEdit}
            onDelete={setDeletingItem}
            onClear={boughtItems.length ? () => clearBoughtShopping() : undefined}
          /> : null}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground sm:px-5">
            <span>Belum dibeli {formatCurrency(openEstimate)}</span>
            <span>Selesai {formatCurrency(boughtEstimate)} <span className="px-1">·</span> Total {formatCurrency(estimate)}</span>
          </div>
        </div>
      )}

      <ItemEditorDialog open={editorOpen} onOpenChange={setEditorOpen} item={editingItem} />
      <Dialog open={Boolean(deletingItem)} onOpenChange={(open) => { if (!open && !deleting) setDeletingItem(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus “{deletingItem?.name ?? "barang"}”?</DialogTitle>
            <DialogDescription>Barang ini akan dihapus dari daftar belanja.</DialogDescription>
          </DialogHeader>
          {deleteError ? <p role="alert" className="rounded-md bg-negative/10 px-3 py-2 text-sm text-negative">{deleteError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={() => setDeletingItem(null)} disabled={deleting}>Batal</Button>
            <Button type="button" variant="destructive" className="h-11" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ShoppingSection({
  title,
  items,
  emptyText,
  pending,
  onToggle,
  onEdit,
  onDelete,
  onClear,
}: {
  title: string;
  items: ShoppingItem[];
  emptyText?: string;
  pending: boolean;
  onToggle: (item: ShoppingItem) => void;
  onEdit: (item: ShoppingItem) => void;
  onDelete: (item: ShoppingItem) => void;
  onClear?: () => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  return (
    <section aria-label={title}>
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4 sm:px-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.09em] text-muted-foreground">{title}<span className="ml-2 tabular font-normal">{items.length}</span></h2>
        {onClear ? <ConfirmDelete
          title="Bersihkan barang yang sudah dibeli?"
          description="Barang selesai akan dihapus dari daftar untuk kalian berdua."
          onConfirm={onClear}
          trigger={<Button variant="ghost" size="sm" className="h-11 text-muted-foreground">Bersihkan</Button>}
        /> : null}
      </div>
      {items.length ? <ul className="divide-y divide-border px-2 sm:px-3">
        {items.map((item) => <ShoppingRow key={item.id} item={item} disabled={pending} onToggle={() => onToggle(item)} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />)}
      </ul> : emptyText ? <p className="px-4 py-6 text-sm text-muted-foreground sm:px-5">{emptyText}</p> : null}
    </section>
  );
}

function ShoppingRow({ item, disabled, onToggle, onEdit, onDelete }: {
  item: ShoppingItem;
  disabled: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className={cn("grid min-h-[68px] grid-cols-[2.75rem_minmax(0,1fr)_2.5rem] items-center gap-1 py-1 transition-opacity duration-200 sm:gap-2", item.is_bought && "opacity-65")}>
      <CheckButton
        checked={item.is_bought}
        onClick={onToggle}
        disabled={disabled}
        touchTarget
        label={item.is_bought ? `Tandai belum dibeli: ${item.name}` : `Tandai sudah dibeli: ${item.name}`}
      />
      <div className="grid min-w-0 items-center gap-x-3 gap-y-1 py-2 md:grid-cols-[minmax(0,1fr)_8rem_10rem]">
        <div className="min-w-0">
          <p className={cn("truncate text-sm font-medium transition-[color,text-decoration-color]", item.is_bought && "text-muted-foreground line-through decoration-border")}>
            {item.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground md:hidden">
            {item.quantity ? `${item.quantity} · ` : ""}{item.estimated_price !== null ? formatCurrency(Number(item.estimated_price)) : "Tanpa estimasi"}
            {item.assigned_to !== "shared" ? ` · ${OWNER_LABEL[item.assigned_to]}` : ""}
          </p>
          {item.assigned_to !== "shared" ? <p className="mt-0.5 hidden text-[11px] text-muted-foreground md:block">{OWNER_LABEL[item.assigned_to]}</p> : null}
        </div>
        <span className="hidden truncate text-xs text-muted-foreground md:block">{item.quantity || "—"}</span>
        <span className={cn("hidden tabular text-right text-sm md:block", item.estimated_price === null && "text-muted-foreground", item.is_bought && "text-muted-foreground")}>
          {item.estimated_price !== null ? formatCurrency(Number(item.estimated_price)) : "—"}
        </span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label={`Aksi untuk ${item.name}`} className="h-11 w-11 text-muted-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}><Pencil className="h-4 w-4" />Ubah</DropdownMenuItem>
          <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" />Hapus</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function ItemEditorDialog({ open, onOpenChange, item }: { open: boolean; onOpenChange: (open: boolean) => void; item: ShoppingItem | null }) {
  const { run, pending, error } = useAction();
  const initialAssignee: MemberOwner = item?.assigned_to ?? "shared";

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    run(
      () => item ? updateShoppingItem(item.id, data) : createShoppingItem(data),
      () => { form.reset(); onOpenChange(false); },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!pending) onOpenChange(nextOpen); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Ubah Barang" : "Tambah Barang"}</DialogTitle>
          <DialogDescription>Catat barang dan perkiraan belanjanya.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shopping-name">Nama barang</Label>
            <Input id="shopping-name" name="name" defaultValue={item?.name ?? ""} placeholder="Contoh: Beras" maxLength={120} required autoFocus />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shopping-quantity">Jumlah & satuan</Label>
              <Input id="shopping-quantity" name="quantity" defaultValue={item?.quantity ?? ""} placeholder="Contoh: 5 kg" maxLength={80} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shopping-price">Harga perkiraan</Label>
              <MoneyInput id="shopping-price" name="estimated_price" defaultValue={item?.estimated_price ?? ""} placeholder="Opsional" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="shopping-assignee">Yang belanja</Label>
            <Select id="shopping-assignee" name="assigned_to" defaultValue={initialAssignee}>
              <option value="shared">{OWNER_LABEL.shared}</option>
              <option value="eki">{OWNER_LABEL.eki}</option>
              <option value="dinda">{OWNER_LABEL.dinda}</option>
            </Select>
          </div>
          {error ? <p role="alert" className="rounded-md bg-negative/10 px-3 py-2 text-sm text-negative">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)} disabled={pending}>Batal</Button>
            <Button type="submit" className="h-11" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : item ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {item ? "Simpan" : "Tambahkan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
