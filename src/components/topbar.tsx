import { Plus } from "lucide-react";
import { MobileMenu } from "@/components/mobile-menu";
import { TransactionDialog } from "@/components/transaction-dialog";
import { Button } from "@/components/ui/button";
import type { Account, Category, MemberOwner } from "@/lib/types";

export function Topbar({
  accounts,
  categories,
  defaultOwner,
  name,
}: {
  accounts: Pick<Account, "id" | "name">[];
  categories: Pick<Category, "id" | "name" | "kind">[];
  defaultOwner: MemberOwner;
  name: string;
}) {
  const today = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur lg:px-8">
      <div className="flex items-center gap-2">
        <MobileMenu />
        <div>
          <p className="text-sm font-medium leading-tight">{name}</p>
          <p className="hidden text-xs text-muted-foreground sm:block">{today}</p>
        </div>
      </div>

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
    </header>
  );
}
