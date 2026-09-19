import { Plus } from "lucide-react";
import { MobileMenu } from "@/components/mobile-menu";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { TransactionDialog } from "@/components/transaction-dialog";
import { Button } from "@/components/ui/button";
import type { Account, Category, MemberOwner } from "@/lib/types";

export function Topbar({
  accounts,
  categories,
  defaultOwner,
  name,
  householdName,
}: {
  accounts: Pick<Account, "id" | "name">[];
  categories: Pick<Category, "id" | "name" | "kind">[];
  defaultOwner: MemberOwner;
  name: string;
  householdName: string;
}) {
  const today = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 flex h-[calc(4rem+env(safe-area-inset-top))] items-center justify-between gap-3 border-b border-border bg-background/95 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] backdrop-blur lg:px-8">
      {/* Saat dibuka dari layar utama iPhone, status bar transparan dan ikonnya putih. Area di bawah
          notch diberi warna gelap (sama dengan sidebar) supaya jam dan baterai tetap terbaca.
          Di Safari tingginya 0, jadi tidak terlihat. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[env(safe-area-inset-top)] bg-sidebar" />
      <div className="flex items-center gap-2">
        <MobileMenu householdName={householdName} variant="topbar" />
        <ThemeSwitcher />
        <TransactionDialog
          accounts={accounts}
          categories={categories}
          defaultOwner={defaultOwner}
          trigger={
            <Button size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tambah transaksi</span>
              <span className="sm:hidden">Tambah</span>
            </Button>
          }
        />
      </div>
    </header>
  );
}
