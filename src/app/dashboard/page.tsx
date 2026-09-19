import { Suspense } from "react";
import { BalanceHero, BalanceHeroSkeleton } from "@/components/dashboard/balance-hero";
import { DashboardBanner, type BannerSettings } from "@/components/dashboard/banner";
import { DashboardEditProvider, EditWidgetsButton } from "@/components/dashboard/edit-context";
import { WidgetBoard } from "@/components/dashboard/widget-board";
import { AccountsWidget } from "@/components/dashboard/widgets/accounts-widget";
import { CategoriesWidget } from "@/components/dashboard/widgets/categories-widget";
import { FlowWidget, type FlowPoint } from "@/components/dashboard/widgets/flow-widget";
import { GoalsWidget } from "@/components/dashboard/widgets/goals-widget";
import { ShoppingWidget, TasksWidget, WishlistWidget } from "@/components/dashboard/widgets/life-widgets";
import { RecentWidget, type RecentRow } from "@/components/dashboard/widgets/recent-widget";
import { StatWidget } from "@/components/dashboard/widgets/stat-widget";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { isoDateInZone } from "@/lib/balance-history";
import { groupByCategory, groupByMonth, sumTotals, trend } from "@/lib/analytics";
import { lastMonths, monthKey, monthLabel, monthRange, percent } from "@/lib/format";
import {
  resolveLayout,
  sanitizeBalanceStyle,
  type SavedWidgetRow,
  type WidgetKey,
} from "@/lib/widgets";
import type {
  Account,
  Category,
  ItemPriority,
  MemberOwner,
  SavingsGoal,
  Transaction,
} from "@/lib/types";
import type { ViewKey } from "@/components/member-switcher";

export const dynamic = "force-dynamic";

const PRIORITY_ORDER: Record<ItemPriority, number> = { high: 0, medium: 1, low: 2 };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view: ViewKey = params.view === "eki" || params.view === "dinda" ? params.view : "bersama";

  const supabase = await createClient();
  const workspace = await getWorkspace();

  const months = lastMonths(6);
  const rangeStart = monthRange(months[0]).start;
  const thisMonth = monthKey();
  const prevMonth = months[months.length - 2];
  const today = isoDateInZone(new Date());

  const [
    { data: accounts },
    { data: transactions },
    { data: categories },
    { data: goals },
    { data: recent },
    { data: settings },
    { data: savedWidgets },
    { data: taskRows },
    { data: shoppingRows },
    { data: wishRows },
  ] = await Promise.all([
    supabase.from("accounts").select("*").eq("is_active", true).order("balance", { ascending: false }),
    supabase
      .from("transactions")
      .select("id, type, amount, occurred_on, category_id, owner")
      .gte("occurred_on", rangeStart),
    supabase.from("categories").select("id, name, color, kind, icon_key"),
    supabase.from("savings_goals").select("*").eq("is_archived", false).order("created_at").limit(8),
    supabase
      .from("transactions")
      .select("id, type, amount, occurred_on, description, owner, category:categories(id, name, color, icon_key)")
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("workspace_settings").select("*").maybeSingle(),
    // Susunan widget milik user ini (RLS: hanya barisnya sendiri). Error → susunan bawaan.
    supabase.from("dashboard_widgets").select("widget_key, position, span, row_span, is_visible, config"),
    supabase
      .from("tasks")
      .select("id, title, due_on, assigned_to")
      .eq("is_done", false)
      .order("due_on", { ascending: true, nullsFirst: false })
      .limit(30),
    supabase
      .from("shopping_items")
      .select("id, name, quantity, estimated_price, assigned_to")
      .eq("is_bought", false)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("wishlist_items")
      .select("id, name, price, priority, owner")
      .eq("is_purchased", false)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const mine = <T extends { owner?: MemberOwner; assigned_to?: MemberOwner }>(row: T) => {
    const owner = row.owner ?? row.assigned_to;
    return view === "bersama" || owner === view || owner === "shared";
  };

  const accountList = ((accounts ?? []) as Account[]).filter(mine);
  const allTxs = (transactions ?? []) as Pick<
    Transaction,
    "id" | "type" | "amount" | "occurred_on" | "category_id" | "owner"
  >[];
  const txs = view === "bersama" ? allTxs : allTxs.filter((t) => t.owner === view);
  const categoryList = (categories ?? []) as Pick<Category, "id" | "name" | "color" | "kind" | "icon_key">[];
  const goalList = ((goals ?? []) as SavingsGoal[]).filter(mine);

  const recentList: RecentRow[] = (recent ?? [])
    .filter((t) => view === "bersama" || t.owner === view)
    .slice(0, 12)
    .map((t) => {
      const category = Array.isArray(t.category) ? t.category[0] : t.category;
      return {
        id: t.id as string,
        type: t.type as RecentRow["type"],
        amount: Number(t.amount),
        occurred_on: t.occurred_on as string,
        description: (t.description as string | null) ?? null,
        owner: t.owner as MemberOwner,
        category: category
          ? {
              name: category.name as string,
              color: category.color as string,
              icon_key: (category.icon_key as string | null) ?? null,
            }
          : null,
      };
    });

  const totalBalance = accountList.reduce((sum, a) => sum + Number(a.balance), 0);
  const current = sumTotals(txs.filter((t) => t.occurred_on.startsWith(thisMonth)));
  const previous = sumTotals(txs.filter((t) => t.occurred_on.startsWith(prevMonth)));
  const savingsRate = current.income > 0 ? percent(current.net, current.income) : 0;

  const monthly = groupByMonth(txs, months);
  const flowData: FlowPoint[] = monthly.map((m) => ({
    label: monthLabel(m.month).split(" ")[0].slice(0, 3),
    fullLabel: monthLabel(m.month),
    income: m.income,
    expense: m.expense,
  }));
  const seriesOf = (pick: (m: (typeof monthly)[number]) => number) =>
    monthly.map((m) => ({ label: monthLabel(m.month), value: pick(m) }));

  const spendingByCategory = groupByCategory(
    txs.filter((t) => t.occurred_on.startsWith(thisMonth)),
    categoryList,
    "expense"
  ).slice(0, 8);

  const banner: BannerSettings = {
    banner_image_url: (settings?.banner_image_url as string | null) ?? null,
    banner_title: (settings?.banner_title as string | undefined) ?? "Selamat datang",
    banner_subtitle:
      (settings?.banner_subtitle as string | undefined) ?? "Keuangan yang terencana, hidup yang lebih tenang.",
    banner_quote: (settings?.banner_quote as string | undefined) ?? "Sedikit demi sedikit, jadi besar.",
  };

  const memberName = (key: MemberOwner) =>
    workspace?.members.find((m) => m.member_key === key)?.full_name ||
    (key === "eki" ? "Eki" : "Dinda");

  // ── susunan widget
  const saved = (savedWidgets ?? null) as (SavedWidgetRow & { config?: unknown })[] | null;
  const layout = resolveLayout(saved);
  const balanceStyle = sanitizeBalanceStyle(saved?.find((row) => row.widget_key === "balance")?.config);

  const viewLabel = view === "bersama" ? "Bersama" : memberName(view);

  const nodes: Partial<Record<WidgetKey, React.ReactNode>> = {
    balance: (
      <Suspense fallback={<BalanceHeroSkeleton />}>
        <BalanceHero
          accounts={accountList}
          total={totalBalance}
          income={current.income}
          expense={current.expense}
          viewLabel={viewLabel}
          style={balanceStyle}
          householdId={workspace?.householdId ?? null}
        />
      </Suspense>
    ),
    income: (
      <StatWidget
        kind="income"
        title="Pemasukan"
        series={seriesOf((m) => m.income)}
        changePercent={trend(current.income, previous.income)}
      />
    ),
    expense: (
      <StatWidget
        kind="expense"
        title="Pengeluaran"
        series={seriesOf((m) => m.expense)}
        changePercent={trend(current.expense, previous.expense)}
      />
    ),
    net: (
      <StatWidget
        kind="net"
        title="Tabungan bulan ini"
        series={seriesOf((m) => m.income - m.expense)}
        changePercent={trend(current.net, previous.net)}
        rate={savingsRate}
        hint={current.income > 0 ? `${savingsRate}% dari pemasukan` : "Pemasukan dikurangi pengeluaran"}
      />
    ),
    flow: <FlowWidget data={flowData} />,
    accounts: (
      <AccountsWidget
        accounts={accountList.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          owner: a.owner,
          balance: Number(a.balance),
          icon_key: a.icon_key,
        }))}
      />
    ),
    categories: <CategoriesWidget data={spendingByCategory} monthLabel={monthLabel(thisMonth)} />,
    goals: (
      <GoalsWidget
        today={today}
        goals={goalList.map((g) => ({
          id: g.id,
          name: g.name,
          current_amount: Number(g.current_amount),
          target_amount: Number(g.target_amount),
          target_date: g.target_date,
        }))}
      />
    ),
    recent: <RecentWidget items={recentList} />,
    tasks: (
      <TasksWidget
        today={today}
        tasks={(taskRows ?? []).filter(mine).map((t) => ({
          id: t.id as string,
          title: t.title as string,
          due_on: (t.due_on as string | null) ?? null,
          assigned_to: t.assigned_to as MemberOwner,
        }))}
      />
    ),
    shopping: (
      <ShoppingWidget
        items={(shoppingRows ?? []).filter(mine).map((i) => ({
          id: i.id as string,
          name: i.name as string,
          quantity: (i.quantity as string | null) ?? null,
          estimated_price: i.estimated_price === null ? null : Number(i.estimated_price),
          assigned_to: i.assigned_to as MemberOwner,
        }))}
      />
    ),
    wishlist: (
      <WishlistWidget
        items={(wishRows ?? [])
          .filter(mine)
          .map((w) => ({
            id: w.id as string,
            name: w.name as string,
            price: w.price === null ? null : Number(w.price),
            priority: w.priority as ItemPriority,
          }))
          .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])}
      />
    ),
  };

  return (
    <DashboardEditProvider>
      <div className="space-y-5">
        {workspace?.householdId ? (
          <DashboardBanner
            settings={banner}
            householdId={workspace.householdId}
            coupleName={view === "bersama" ? workspace.coupleName : memberName(view)}
            view={view}
            labels={{ eki: memberName("eki"), dinda: memberName("dinda") }}
            monthLabel={monthLabel(thisMonth)}
            actions={<EditWidgetsButton />}
          />
        ) : null}

        <WidgetBoard initial={layout} nodes={nodes} />
      </div>
    </DashboardEditProvider>
  );
}
