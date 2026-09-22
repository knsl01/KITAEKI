import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { MobileMenu } from "@/components/mobile-menu";
import { MobileNav } from "@/components/mobile-nav";
import { PageTransition } from "@/components/page-transition";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { TransactionDialog } from "@/components/transaction-dialog";
import { KitaAiWidget } from "@/components/kita-ai-widget";
import { NotificationPrompt } from "@/components/notification-prompt";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { getMobileNavItems } from "@/lib/nav";

import { cookies } from "next/headers";
import type { ViewKey } from "@/components/member-switcher";

type BudgetPost = { id: string; account_id: string | null; category_id: string; category: { id: string; name: string } | null };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspace = await getWorkspace();

  const monthStart = `${new Date().toISOString().slice(0, 7)}-01`;
  const [{ data: accounts }, { data: categories }, { data: budgets }, { data: preferences }] = await Promise.all([
    supabase.from("accounts").select("id, name, icon_key").eq("is_active", true).order("name"),
    supabase.from("categories").select("id, name, kind, icon_key, color").order("name"),
    supabase.from("budgets").select("id, account_id, category_id").eq("period_month", monthStart),
    supabase.from("user_preferences").select("mobile_nav").eq("user_id", user.id).maybeSingle(),
  ]);
  const mobileItems = getMobileNavItems(preferences?.mobile_nav);

  const cookieStore = await cookies();
  const currentView = (cookieStore.get("kita_view")?.value as ViewKey) || "bersama";
  const memberLabels = {
    eki: workspace?.member1Name || "Eki",
    dinda: workspace?.member2Name || "Dinda",
  };
  const categoryNames = new Map((categories ?? []).map((category) => [category.id, category.name]));
  const budgetPosts: BudgetPost[] = (budgets ?? []).map((budget) => ({
    id: budget.id,
    account_id: budget.account_id,
    category_id: budget.category_id,
    category: categoryNames.has(budget.category_id)
      ? { id: budget.category_id, name: categoryNames.get(budget.category_id)! }
      : null,
  }));

  return (
    <div className="min-h-screen">
      <Sidebar householdName={workspace?.householdName ?? "KITA"} />

      <div className="app-shell">
        <Topbar
          accounts={accounts ?? []}
          categories={categories ?? []}
          budgets={budgetPosts}
          defaultOwner={workspace?.memberKey ?? "shared"}
          name={workspace?.displayName ?? "Kita"}
          householdName={workspace?.householdName ?? "KITA"}
          currentView={currentView}
          memberLabels={memberLabels}
        />
        <main className="pb-32 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-6 lg:px-8 lg:pb-12">
          <NotificationPrompt />
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      <MobileNav
        items={mobileItems}
        menu={
          <MobileMenu 
            householdName={workspace?.householdName ?? "KITA"} 
            variant="nav"
            currentView={currentView}
            memberLabels={memberLabels}
          />
        }
        action={
          <TransactionDialog
            accounts={accounts ?? []}
            categories={categories ?? []}
            budgets={budgetPosts}
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
      <KitaAiWidget />
    </div>
  );
}
