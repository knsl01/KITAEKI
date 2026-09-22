import { SettingsClient } from "@/components/views/settings-client";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import type { MemberOwner } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pengaturan — KITA" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const workspace = await getWorkspace();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, default_owner")
    .eq("id", user!.id)
    .maybeSingle();

  const [{ count: accountCount }, { count: transactionCount }, { data: preferences }] = await Promise.all([
    supabase.from("accounts").select("id", { count: "exact", head: true }),
    supabase.from("transactions").select("id", { count: "exact", head: true }),
    supabase.from("user_preferences").select("mobile_nav").eq("user_id", user!.id).maybeSingle(),
  ]);

  return (
    <SettingsClient
      email={user?.email ?? ""}
      fullName={profile?.full_name ?? ""}
      defaultOwner={(profile?.default_owner as MemberOwner) ?? "shared"}
      accountCount={accountCount ?? 0}
      transactionCount={transactionCount ?? 0}
      householdName={workspace?.householdName ?? "KITA"}
      inviteCode={workspace?.inviteCode ?? null}
      memberKey={workspace?.memberKey ?? "eki"}
      members={workspace?.members ?? []}
      mobileNav={(preferences?.mobile_nav as string[] | null) ?? null}
    />
  );
}
