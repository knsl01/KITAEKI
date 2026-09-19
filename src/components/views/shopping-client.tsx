"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { clearBoughtShopping, createShoppingItem, deleteShoppingItem, toggleShoppingItem } from "@/app/actions/shopping";
import { ConfirmDelete } from "@/components/confirm-delete";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { CheckButton, FormError, matchesOwner, OwnerFilterTabs, useAction, type OwnerFilter } from "@/components/views/life-shared";
import { formatCurrency } from "@/lib/format";
import { OWNER_LABEL, type ShoppingItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ShoppingClient({ items }: { items: ShoppingItem[] }) {
  const [filter, setFilter] = useState<OwnerFilter>("all");
  const { run, pending, error } = useAction();

  const visible = items.filter((i) => matchesOwner(filter, i.assigned_to));
  const toBuy = visible.filter((i) => !i.is_bought);
  const bought = visible.filter((i) => i.is_bought);
  const estimate = toBuy.reduce((sum, i) => sum + Number(i.estimated_price ?? 0), 0);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    run(
      () => createShoppingItem(data),
      () => form.reset()
    );
  }

  return (
    <div>
      <PageHeader
        title="Belanja"
        description="Daftar belanja bersama. Siapa pun yang di toko tinggal centang."
        action={<OwnerFilterTabs value={filter} onChange={setFilter} />}
      />

      <div className="space-y-4">
        <Card>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_8rem_10rem_9rem_auto]">
              <Input name="name" placeholder="Tambah barang" aria-label="Nama barang" required />
              <Input name="quantity" placeholder="Jumlah" aria-label="Jumlah" />
              <MoneyInput name="estimated_price" placeholder="Perkiraan harga" aria-label="Perkiraan harga" />
              <Select name="assigned_to" defaultValue="shared" aria-label="Siapa yang beli">
                <option value="shared">{OWNER_LABEL.shared}</option>
                <option value="eki">{OWNER_LABEL.eki}</option>
                <option value="dinda">{OWNER_LABEL.dinda}</option>
              </Select>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Tambah
              </Button>
            </form>
            <div className="mt-3 empty:hidden">
              <FormError message={error} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Yang perlu dibeli</CardTitle>
            <span className="tabular text-xs text-muted-foreground">
              {toBuy.length} barang{estimate > 0 ? ` · perkiraan ${formatCurrency(estimate)}` : ""}
            </span>
          </CardHeader>
          <CardContent className="pt-2">
            {toBuy.length === 0 ? (
              <EmptyState title="Daftar belanja kosong" description="Tambah barang di atas, nanti muncul di sini." className="py-10" />
            ) : (
              <ul className="divide-y divide-border">
                {toBuy.map((item) => (
                  <ItemRow key={item.id} item={item} pending={pending} onToggle={() => run(() => toggleShoppingItem(item.id, true))} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {bought.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Sudah dibeli</CardTitle>
              <ConfirmDelete
                title="Bersihkan yang sudah dibeli?"
                description="Semua barang bertanda sudah dibeli akan dihapus dari daftar, untuk kalian berdua."
                onConfirm={async () => clearBoughtShopping()}
                trigger={
                  <Button variant="ghost" size="sm">
                    Bersihkan
                  </Button>
                }
              />
            </CardHeader>
            <CardContent className="pt-2">
              <ul className="divide-y divide-border">
                {bought.map((item) => (
                  <ItemRow key={item.id} item={item} pending={pending} onToggle={() => run(() => toggleShoppingItem(item.id, false))} />
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function ItemRow({ item, onToggle, pending }: { item: ShoppingItem; onToggle: () => void; pending: boolean }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <CheckButton
        checked={item.is_bought}
        onClick={onToggle}
        disabled={pending}
        label={item.is_bought ? `Tandai belum dibeli: ${item.name}` : `Tandai sudah dibeli: ${item.name}`}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", item.is_bought && "text-muted-foreground line-through")}>
          {item.name}
          {item.quantity ? <span className="text-muted-foreground"> · {item.quantity}</span> : null}
        </p>
        <p className="tabular mt-0.5 text-xs text-muted-foreground">
          {OWNER_LABEL[item.assigned_to]}
          {item.estimated_price ? ` · ${formatCurrency(Number(item.estimated_price))}` : ""}
        </p>
      </div>
      <ConfirmDelete
        title="Hapus barang?"
        description="Barang ini akan dihapus dari daftar belanja."
        onConfirm={async () => deleteShoppingItem(item.id)}
        trigger={
          <Button variant="ghost" size="icon" aria-label={`Hapus barang: ${item.name}`}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        }
      />
    </li>
  );
}
