"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { createCategory, deleteCategory, updateCategory } from "@/app/actions/categories";
import { ConfirmDelete } from "@/components/confirm-delete";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Category } from "@/lib/types";

function CategoryDialog({ category, trigger }: { category?: Category; trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = category ? await updateCategory(category.id, formData) : await createCategory(formData);
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
          <DialogTitle>{category ? "Ubah kategori" : "Tambah kategori"}</DialogTitle>
        </DialogHeader>

        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama</Label>
            <Input id="name" name="name" placeholder="Makanan" defaultValue={category?.name} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kind">Jenis</Label>
              <Select id="kind" name="kind" defaultValue={category?.kind ?? "expense"}>
                <option value="expense">Pengeluaran</option>
                <option value="income">Pemasukan</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Warna</Label>
              <Input
                id="color"
                name="color"
                type="color"
                className="h-10 p-1"
                defaultValue={category?.color ?? "#3F5540"}
              />
            </div>
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

function CategoryList({ title, items }: { title: string; items: Category[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <span className="text-xs text-muted-foreground">{items.length} kategori</span>
      </CardHeader>
      <CardContent className="pt-2">
        {items.length === 0 ? (
          <EmptyState title="Belum ada kategori" description="Tambah kategori untuk mengelompokkan transaksi." />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((category) => (
              <li key={category.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="flex min-w-0 items-center gap-3 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                  <span className="truncate">{category.name}</span>
                </span>
                <span className="flex shrink-0 gap-1">
                  <CategoryDialog
                    category={category}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label="Ubah kategori">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <ConfirmDelete
                    title="Hapus kategori?"
                    description="Transaksi yang memakai kategori ini akan jadi tanpa kategori."
                    onConfirm={async () => deleteCategory(category.id)}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label="Hapus kategori">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    }
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function CategoriesClient({ categories }: { categories: Category[] }) {
  return (
    <div>
      <PageHeader
        title="Kategori"
        description="Kelompok pemasukan dan pengeluaran yang dipakai di seluruh catatan."
        action={
          <CategoryDialog
            trigger={
              <Button>
                <Plus className="h-4 w-4" />
                Tambah kategori
              </Button>
            }
          />
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryList title="Pengeluaran" items={categories.filter((c) => c.kind === "expense")} />
        <CategoryList title="Pemasukan" items={categories.filter((c) => c.kind === "income")} />
      </div>
    </div>
  );
}
