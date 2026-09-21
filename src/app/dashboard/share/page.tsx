import { redirect } from "next/navigation";
import { getWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { ShareClient } from "@/components/views/share-client";

export default async function SharePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspace = await getWorkspace();
  if (!workspace) redirect("/login");

  // Get total balance
  const { data: accounts } = await supabase
    .from("accounts")
    .select("balance")
    .eq("household_id", workspace.householdId);
  const totalBalance = (accounts ?? []).reduce((acc, curr) => acc + (curr.balance || 0), 0);

  // Get savings goals
  const { data: savings } = await supabase
    .from("savings_goals")
    .select("name, target_amount, current_amount")
    .eq("is_archived", false);

  // Members for avatars
  const members = workspace.members;

  return (
    <div className="max-w-md mx-auto relative min-h-[calc(100vh-4rem)] pb-24">
      <ShareClient
        totalBalance={totalBalance}
        savings={savings ?? []}
        members={members}
        memberKey={workspace.memberKey}
      />
    </div>
  );
}
