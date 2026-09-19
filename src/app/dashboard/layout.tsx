import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { MobileMenu } from "@/components/mobile-menu";
import { MobileNav } from "@/components/mobile-nav";
import { PageTransition } from "@/components/page-transition";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { TransactionDialog } from "@/components/transaction-dialog";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspace = await getWorkspace();

  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("accounts").select("id, name, icon_key").eq("is_active", true).order("name"),
    supabase.from("categories").select("id, name, kind, icon_key, color").order("name"),
  ]);

  return (
    <div className="min-h-screen">
      <Sidebar householdName={workspace?.householdName ?? "KITA"} />

      <div className="app-shell">
        <Topbar
          accounts={accounts ?? []}
          categories={categories ?? []}
          defaultOwner={workspace?.memberKey ?? "shared"}
          name={workspace?.displayName ?? "Kita"}
          householdName={workspace?.householdName ?? "KITA"}
        />
        <main className="pb-32 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-6 lg:px-8 lg:pb-12">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      <MobileNav
        menu={<MobileMenu householdName={workspace?.householdName ?? "KITA"} variant="nav" />}
        action={
          <TransactionDialog
            accounts={accounts ?? []}
            categories={categories ?? []}
            defaultOwner={workspace?.memberKey ?? "shared"}
            trigger={
              <button
                type="button"
                aria-label="Tambah transaksi"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-200 active:scale-90"
              >
                <Plus className="h-5 w-5" />
              </button>
            }
          />
        }
      />
    </div>
  );
}
