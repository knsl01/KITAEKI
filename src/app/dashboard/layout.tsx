import { redirect } from "next/navigation";
import { MobileNav } from "@/components/mobile-nav";
import { PageTransition } from "@/components/page-transition";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { createClient } from "@/lib/supabase/server";
import type { MemberOwner } from "@/lib/types";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: accounts }, { data: categories }, { data: profile }] = await Promise.all([
    supabase.from("accounts").select("id, name").eq("is_active", true).order("name"),
    supabase.from("categories").select("id, name, kind").order("name"),
    supabase.from("profiles").select("full_name, default_owner").eq("id", user.id).maybeSingle(),
  ]);

  const name = profile?.full_name || user.email?.split("@")[0] || "Kita";

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-64">
        <Topbar
          accounts={accounts ?? []}
          categories={categories ?? []}
          defaultOwner={(profile?.default_owner as MemberOwner) ?? "shared"}
          name={name}
        />
        <main className="px-4 pb-24 pt-6 lg:px-8 lg:pb-10">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
