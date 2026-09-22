import { redirect } from "next/navigation";
import { getWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { getShareData } from "@/lib/share/server";
import { ShareClient } from "@/components/views/share-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Share Story — KITA" };

export default async function SharePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspace = await getWorkspace();
  if (!workspace) redirect("/login");

  const data = await getShareData(supabase, workspace);

  return (
    <div className="mx-auto min-w-0 w-full max-w-6xl overflow-x-hidden pb-24">
      <ShareClient data={data} />
    </div>
  );
}
