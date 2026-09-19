"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createWishlistItem,
  deleteWishlistItem,
  toggleWishlistPurchased,
  updateWishlistItem,
} from "@/app/actions/wishlist";
import { ConfirmDelete } from "@/components/confirm-delete";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckButton, FormError, matchesOwner, OwnerFilterTabs, useAction, type OwnerFilter } from "@/components/views/life-shared";
import { formatCurrency } from "@/lib/format";
import { OWNER_LABEL, PRIORITY_LABEL, type ItemPriority, type WishlistItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const PRIORITY_RANK: Record<ItemPriority, number> = { high: 0, medium: 1, low: 2 };

function WishlistDialog({ item, trigger }: { item?: WishlistItem; trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = item ? await updateWishlistItem(item.id, data) : await createWishlistItem(data);
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Ubah wishlist" : "Tambah ke wishlist"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wl-name">Nama barang</Label>
            <Input id="wl-name" name="name" placeholder="Vacuum cleaner" defaultValue={item?.name} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wl-price">Harga</Label>
              <MoneyInput
                id="wl-price"
                name="price"
                placeholder="1.500.000"
                defaultValue={item?.price ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wl-priority">Prioritas</Label>
              <Select id="wl-priority" name="priority" defaultValue={item?.priority ?? "medium"}>
                <option value="high">Tinggi</option>
                <option value="medium">Sedang</option>
                <option value="low">Rendah</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wl-owner">Untuk</Label>
              <Select id="wl-owner" name="owner" defaultValue={item?.owner ?? "shared"}>
                <option value="shared">{OWNER_LABEL.shared}</option>
                <option value="eki">{OWNER_LABEL.eki}</option>
                <option value="dinda">{OWNER_LABEL.dinda}</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wl-url">Tautan (opsional)</Label>
              <Input id="wl-url" name="url" placeholder="tokopedia.com/…" defaultValue={item?.url ?? ""} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wl-notes">Catatan</Label>
            <Textarea id="wl-notes" name="notes" rows={3} defaultValue={item?.notes ?? ""} />
          </div>

          <FormError message={error} />

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

function WishCard({ item, pending, onToggle }: { item: WishlistItem; pending: boolean; onToggle: () => void }) {
  return (
    <li className="flex items-start gap-3 py-3.5">
      <CheckButton
        checked={item.is_purchased}
        onClick={onToggle}
        disabled={pending}
        label={item.is_purchased ? `Tandai belum terbeli: ${item.name}` : `Tandai sudah terbeli: ${item.name}`}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", item.is_purchased && "text-muted-foreground line-through")}>{item.name}</p>
        <p className="tabular mt-0.5 text-xs text-muted-foreground">
          {OWNER_LABEL[item.owner]}
          {item.price ? ` · ${formatCurrency(Number(item.price))}` : ""}
        </p>
        {item.notes ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.notes}</p> : null}
        {!item.is_purchased ? (
          <Badge tone={item.priority === "high" ? "negative" : "neutral"} className="mt-2">
            {PRIORITY_LABEL[item.priority]}
          </Badge>
        ) : null}
      </div>
      <span className="flex shrink-0 gap-0.5">
        {item.url ? (
          <Button variant="ghost" size="icon" asChild>
            <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Buka tautan: ${item.name}`}>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </Button>
        ) : null}
        <WishlistDialog
          item={item}
          trigger={
            <Button variant="ghost" size="icon" aria-label={`Ubah: ${item.name}`}>
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </Button>
          }
        />
        <ConfirmDelete
          title="Hapus dari wishlist?"
          description="Barang ini akan dihapus untuk kalian berdua."
          onConfirm={async () => deleteWishlistItem(item.id)}
          trigger={
            <Button variant="ghost" size="icon" aria-label={`Hapus: ${item.name}`}>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          }
        />
      </span>
    </li>
  );
}

export function WishlistClient({ items }: { items: WishlistItem[] }) {
  const [filter, setFilter] = useState<OwnerFilter>("all");
  const { run, pending, error } = useAction();

  const visible = items.filter((i) => matchesOwner(filter, i.owner));
  const wanted = visible
    .filter((i) => !i.is_purchased)
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.created_at.localeCompare(b.created_at));
  const purchased = visible.filter((i) => i.is_purchased);
  const total = wanted.reduce((sum, i) => sum + Number(i.price ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Wishlist"
        description="Barang yang ingin dibeli, diurutkan dari yang paling diinginkan."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <OwnerFilterTabs value={filter} onChange={setFilter} />
            <WishlistDialog
              trigger={
                <Button>
                  <Plus className="h-4 w-4" />
                  Tambah
                </Button>
              }
            />
          </div>
        }
      />

      <div className="space-y-4">
        <FormError message={error} />

        <Card>
          <CardHeader>
            <CardTitle>Ingin dibeli</CardTitle>
            <span className="tabular text-xs text-muted-foreground">
              {wanted.length} barang{total > 0 ? ` · total ${formatCurrency(total)}` : ""}
            </span>
          </CardHeader>
          <CardContent className="pt-2">
            {wanted.length === 0 ? (
              <EmptyState title="Wishlist masih kosong" description="Catat barang yang kalian incar supaya tidak lupa." className="py-10" />
            ) : (
              <ul className="divide-y divide-border">
                {wanted.map((item) => (
                  <WishCard key={item.id} item={item} pending={pending} onToggle={() => run(() => toggleWishlistPurchased(item.id, true))} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {purchased.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Sudah terbeli</CardTitle>
              <span className="text-xs text-muted-foreground">{purchased.length} barang</span>
            </CardHeader>
            <CardContent className="pt-2">
              <ul className="divide-y divide-border">
                {purchased.map((item) => (
                  <WishCard key={item.id} item={item} pending={pending} onToggle={() => run(() => toggleWishlistPurchased(item.id, false))} />
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
