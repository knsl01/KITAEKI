"use client";

import { useState } from "react";
import { BrandMarkTile } from "@/components/brand-mark";
import { fitRows, FrameLink, useWidgetBox, WidgetFrame } from "@/components/dashboard/widget-frame";
import { formatCurrency, percent } from "@/lib/format";
import { brandFor } from "@/lib/icons";
import { ACCOUNT_TYPE_LABEL, OWNER_LABEL, type AccountType, type MemberOwner } from "@/lib/types";
import { cn } from "@/lib/utils";

export type AccountRow = {
  id: string;
  name: string;
  type: AccountType;
  owner: MemberOwner;
  balance: number;
  icon_key: string | null;
};

export function AccountsWidget({ accounts }: { accounts: AccountRow[] }) {
  const box = useWidgetBox();
  const [active, setActive] = useState<string | null>(null);

  const positive = accounts.filter((a) => a.balance > 0);
  const positiveTotal = positive.reduce((sum, a) => sum + a.balance, 0);
  const rows = fitRows(box.height, 54, 26);
  const shown = accounts.slice(0, rows);
  const extra = accounts.length - shown.length;

  return (
    <WidgetFrame title="Saldo per akun" action={<FrameLink href="/dashboard/accounts">Kelola</FrameLink>}>
      {accounts.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
          <p className="font-serif text-base">Belum ada akun</p>
          <p className="max-w-[16rem] text-sm text-muted-foreground">Tambah rekening, e-wallet, atau uang tunai untuk mulai mencatat.</p>
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          {/* Komposisi: satu batang, satu potongan per akun */}
          {positiveTotal > 0 ? (
            <div className="mb-2 flex h-2 shrink-0 gap-[3px] overflow-hidden rounded-full" role="img" aria-label="Komposisi saldo per akun">
              {positive.map((a) => (
                <span
                  key={a.id}
                  className="h-full rounded-full transition-[opacity,transform] duration-200"
                  style={{
                    flexGrow: a.balance,
                    flexBasis: 0,
                    minWidth: 4,
                    backgroundColor: brandFor(a.icon_key, a.name).color,
                    opacity: active && active !== a.id ? 0.3 : 1,
                    transform: active === a.id ? "scaleY(1.5)" : undefined,
                  }}
                />
              ))}
            </div>
          ) : null}

          <ul className="min-h-0 flex-1 space-y-0.5 overflow-hidden">
            {shown.map((a) => (
              <li key={a.id}>
                <div
                  onPointerEnter={() => setActive(a.id)}
                  onPointerLeave={() => setActive(null)}
                  className={cn(
                    "group flex h-[52px] items-center gap-3 rounded-xl px-2 transition-colors duration-150",
                    active === a.id && "bg-muted"
                  )}
                >
                  <BrandMarkTile iconKey={a.icon_key} name={a.name} size="sm" className="group-hover:scale-105" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{a.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {ACCOUNT_TYPE_LABEL[a.type]} · {OWNER_LABEL[a.owner]}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={cn("tabular block text-sm", a.balance < 0 && "text-negative")}>{formatCurrency(a.balance)}</span>
                    {a.balance > 0 && positiveTotal > 0 ? (
                      <span className="tabular block text-xs text-muted-foreground">{percent(a.balance, positiveTotal)}%</span>
                    ) : null}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {extra > 0 ? (
            <p className="shrink-0 pt-1 text-center text-xs text-muted-foreground">+{extra} akun lain di halaman Akun</p>
          ) : null}
        </div>
      )}
    </WidgetFrame>
  );
}
