"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  addSavingsContribution,
  createSavingsGoal,
  deleteSavingsGoal,
  updateSavingsGoal,
} from "@/app/actions/savings";
import { ConfirmDelete } from "@/components/confirm-delete";
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
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDate, percent } from "@/lib/format";
import { OWNER_LABEL, type MemberOwner, type SavingsGoal } from "@/lib/types";

function GoalDialog({ goal, trigger }: { goal?: SavingsGoal; trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = goal ? await updateSavingsGoal(goal.id, formData) : await createSavingsGoal(formData);
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
          <DialogTitle>{goal ? "Ubah target" : "Buat target baru"}</DialogTitle>
          <DialogDescription>Misalnya dana rumah, liburan, atau dana darurat.</DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama target</Label>
            <Input id="name" name="name" placeholder="Dana rumah" defaultValue={goal?.name} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="target_amount">Target dana</Label>
              <MoneyInput
                id="target_amount"
                name="target_amount"
                min={1}
                placeholder="40.000.000"
                defaultValue={goal?.target_amount ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_amount">Sudah terkumpul</Label>
              <MoneyInput
                id="current_amount"
                name="current_amount"
                min={0}
                defaultValue={goal?.current_amount ?? 0}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="target_date">Target tanggal</Label>
              <Input id="target_date" name="target_date" type="date" defaultValue={goal?.target_date ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner">Milik</Label>
              <Select id="owner" name="owner" defaultValue={goal?.owner ?? "shared"}>
                {(Object.keys(OWNER_LABEL) as MemberOwner[]).map((o) => (
                  <option key={o} value={o}>
                    {OWNER_LABEL[o]}
                  </option>
                ))}
              </Select>
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

function ContributionDialog({ goal }: { goal: SavingsGoal }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Plus className="h-3.5 w-3.5" />
          Tambah dana
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Tambah dana</DialogTitle>
          <DialogDescription>Isi nominal negatif kalau mau menarik dana dari target ini.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`amount-${goal.id}`}>Nominal</Label>
            <MoneyInput
              id={`amount-${goal.id}`}
              value={amount}
              onValueChange={setAmount}
              allowNegative
              placeholder="500.000"
            />
          </div>

          {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const result = await addSavingsContribution(goal.id, Number(amount));
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setAmount("");
                  setOpen(false);
                  router.refresh();
                })
              }
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Simpan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SavingsClient({ goals }: { goals: SavingsGoal[] }) {
  const totalSaved = goals.reduce((sum, g) => sum + Number(g.current_amount), 0);
  const totalTarget = goals.reduce((sum, g) => sum + Number(g.target_amount), 0);

  return (
    <div>
      <PageHeader
        title="Tabungan & Target"
        description="Rencana jangka pendek dan panjang yang kalian kejar bersama."
        action={
          <GoalDialog
            trigger={
              <Button>
                <Plus className="h-4 w-4" />
                Buat target baru
              </Button>
            }
          />
        }
      />

      <Card className="mb-4">
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Total terkumpul</p>
            <p className="tabular mt-1 text-xl font-bold">{formatCurrency(totalSaved)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total target</p>
            <p className="tabular mt-1 text-xl font-bold">{formatCurrency(totalTarget)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Progres keseluruhan</p>
            <p className="tabular mt-1 text-xl font-bold">{percent(totalSaved, totalTarget)}%</p>
          </div>
        </CardContent>
      </Card>

      {goals.length === 0 ? (
        <Card>
          <EmptyState title="Belum ada target" description="Buat target pertama, misalnya dana darurat." />
        </Card>
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => {
            const pct = percent(Number(goal.current_amount), Number(goal.target_amount));
            return (
              <Card key={goal.id} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{goal.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {OWNER_LABEL[goal.owner]}
                      {goal.target_date ? ` · target ${formatDate(goal.target_date)}` : ""}
                    </p>
                  </div>
                  {pct >= 100 ? <Badge tone="positive">Tercapai</Badge> : null}
                </div>

                <p className="tabular mt-4 text-lg font-bold">{formatCurrency(Number(goal.current_amount))}</p>
                <p className="tabular text-xs text-muted-foreground">
                  dari {formatCurrency(Number(goal.target_amount))} · {pct}%
                </p>
                <Progress value={pct} className="mt-3" />

                <div className="mt-4 flex flex-wrap gap-1 border-t border-border pt-3">
                  <ContributionDialog goal={goal} />
                  <GoalDialog
                    goal={goal}
                    trigger={
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-3.5 w-3.5" />
                        Ubah
                      </Button>
                    }
                  />
                  <ConfirmDelete
                    title="Hapus target?"
                    onConfirm={async () => deleteSavingsGoal(goal.id)}
                    trigger={
                      <Button variant="ghost" size="sm" className="text-muted-foreground">
                        <Trash2 className="h-3.5 w-3.5" />
                        Hapus
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
