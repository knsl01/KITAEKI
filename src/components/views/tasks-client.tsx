"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { createTask, deleteTask, toggleTask } from "@/app/actions/tasks";
import { ConfirmDelete } from "@/components/confirm-delete";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CheckButton, FormError, matchesOwner, OwnerFilterTabs, useAction, type OwnerFilter } from "@/components/views/life-shared";
import { isoDateInZone } from "@/lib/balance-history";
import { formatDate } from "@/lib/format";
import { OWNER_LABEL, type Task } from "@/lib/types";
import { cn } from "@/lib/utils";

function byDue(a: Task, b: Task) {
  const due = (a.due_on ?? "9999-12-31").localeCompare(b.due_on ?? "9999-12-31");
  return due !== 0 ? due : a.created_at.localeCompare(b.created_at);
}

export function TasksClient({ tasks }: { tasks: Task[] }) {
  const [filter, setFilter] = useState<OwnerFilter>("all");
  const { run, pending, error } = useAction();
  const today = isoDateInZone(new Date());

  const visible = tasks.filter((t) => matchesOwner(filter, t.assigned_to));
  const open = visible.filter((t) => !t.is_done).sort(byDue);
  const done = visible.filter((t) => t.is_done);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    run(
      () => createTask(data),
      () => form.reset()
    );
  }

  return (
    <div>
      <PageHeader
        title="Tugas"
        description="Hal-hal yang perlu diurus berdua, dibagi biar tidak ada yang terlewat."
        action={<OwnerFilterTabs value={filter} onChange={setFilter} />}
      />

      <div className="space-y-4">
        <Card>
          <CardContent>
            <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
              <Input name="title" placeholder="Tambah tugas baru" aria-label="Judul tugas" required className="sm:flex-1" />
              <div className="sm:w-36">
                <Select name="assigned_to" defaultValue="shared" aria-label="Untuk siapa">
                  <option value="shared">{OWNER_LABEL.shared}</option>
                  <option value="eki">{OWNER_LABEL.eki}</option>
                  <option value="dinda">{OWNER_LABEL.dinda}</option>
                </Select>
              </div>
              <Input name="due_on" type="date" aria-label="Tenggat" className="sm:w-40" />
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
            <CardTitle>Belum selesai</CardTitle>
            <span className="text-xs text-muted-foreground">{open.length} tugas</span>
          </CardHeader>
          <CardContent className="pt-2">
            {open.length === 0 ? (
              <EmptyState title="Semua beres" description="Tidak ada tugas yang menunggu. Nikmati harinya." className="py-10" />
            ) : (
              <ul className="divide-y divide-border">
                {open.map((task) => (
                  <TaskRow key={task.id} task={task} today={today} onToggle={() => run(() => toggleTask(task.id, true))} pending={pending} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {done.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Selesai</CardTitle>
              <span className="text-xs text-muted-foreground">{done.length} tugas</span>
            </CardHeader>
            <CardContent className="pt-2">
              <ul className="divide-y divide-border">
                {done.map((task) => (
                  <TaskRow key={task.id} task={task} today={today} onToggle={() => run(() => toggleTask(task.id, false))} pending={pending} />
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  today,
  onToggle,
  pending,
}: {
  task: Task;
  today: string;
  onToggle: () => void;
  pending: boolean;
}) {
  const overdue = !task.is_done && task.due_on !== null && task.due_on < today;

  return (
    <li className="flex items-start gap-3 py-3">
      <CheckButton
        checked={task.is_done}
        onClick={onToggle}
        disabled={pending}
        label={task.is_done ? `Tandai belum selesai: ${task.title}` : `Tandai selesai: ${task.title}`}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", task.is_done && "text-muted-foreground line-through")}>{task.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {OWNER_LABEL[task.assigned_to]}
          {task.due_on ? (
            <>
              {" · "}
              <span className={cn(overdue && "font-medium text-negative")}>
                {overdue ? "Lewat tenggat, " : ""}
                {formatDate(task.due_on)}
              </span>
            </>
          ) : null}
        </p>
      </div>
      <ConfirmDelete
        title="Hapus tugas?"
        description="Tugas ini akan dihapus untuk kalian berdua."
        onConfirm={async () => deleteTask(task.id)}
        trigger={
          <Button variant="ghost" size="icon" aria-label={`Hapus tugas: ${task.title}`}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        }
      />
    </li>
  );
}
