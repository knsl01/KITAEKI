"use client";

import { Wallet } from "lucide-react";
import { CategoryIconTile } from "@/components/brand-mark";
import { fitRows, FrameLink, useWidgetBox, WidgetFrame } from "@/components/dashboard/widget-frame";
import { TransactionAmount } from "@/components/transaction-amount";
import { formatDate } from "@/lib/format";
import { OWNER_LABEL, type MemberOwner, type TransactionType } from "@/lib/types";

export type RecentRow = {
  id: string;
  type: TransactionType;
  amount: number;
  occurred_on: string;
  description: string | null;
  owner: MemberOwner;
  category: { name: string; color: string; icon_key: string | null } | null;
};

export function RecentWidget({ items }: { items: RecentRow[] }) {
  const box = useWidgetBox();
  const columns = box.width >= 760 ? 2 : 1;
  const perColumn = fitRows(box.height, 56);
  const shown = items.slice(0, perColumn * columns);

  return (
    <WidgetFrame title="Transaksi terbaru" action={<FrameLink href="/dashboard/transactions">Lihat semua</FrameLink>}>
      {items.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
          <p className="font-serif text-base">Belum ada transaksi</p>
          <p className="max-w-[18rem] text-sm text-muted-foreground">Pakai tombol Tambah transaksi di kanan atas untuk mencatat yang pertama.</p>
        </div>
      ) : (
        <ul
          className="grid min-h-0 gap-x-8 overflow-hidden"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridAutoFlow: "column", gridTemplateRows: `repeat(${Math.ceil(shown.length / columns)}, minmax(0, auto))` }}
        >
          {shown.map((t) => (
            <li key={t.id} className="group flex h-14 items-center gap-3 rounded-xl px-2 transition-colors duration-150 hover:bg-muted/70">
              {t.category ? (
                <CategoryIconTile
                  iconKey={t.category.icon_key}
                  name={t.category.name}
                  color={t.category.color}
                  size="sm"
                  className="group-hover:scale-105"
                />
              ) : (
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-muted text-muted-foreground">
                  <Wallet className="h-4 w-4" aria-hidden />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{t.description || t.category?.name || "Tanpa catatan"}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {formatDate(t.occurred_on)} · {OWNER_LABEL[t.owner]}
                </p>
              </div>
              <TransactionAmount type={t.type} amount={Number(t.amount)} className="shrink-0 text-sm" />
            </li>
          ))}
        </ul>
      )}
    </WidgetFrame>
  );
}
