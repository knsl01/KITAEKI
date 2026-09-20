import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { MemberOwner } from "@/lib/types";

export type WorkspaceMember = {
  user_id: string;
  member_key: MemberOwner;
  full_name: string | null;
  email: string | null;
};

export type Workspace = {
  householdId: string | null;
  householdName: string;
  inviteCode: string | null;
  memberKey: MemberOwner;
  members: WorkspaceMember[];
  displayName: string;
  /** Nama gabungan untuk sapaan, misalnya "Eki & Dinda". */
  coupleName: string;
  member1Name: string;
  member2Name: string;
};

import { cookies } from "next/headers";
import type { ViewKey } from "@/components/member-switcher";

export async function getView(): Promise<ViewKey> {
  const cookieStore = await cookies();
  return (cookieStore.get("kita_view")?.value as ViewKey) || "bersama";
}

/**
 * Dipakai banyak komponen dalam satu render, jadi hasilnya di-cache per request.
 */
export const getWorkspace = cache(async (): Promise<Workspace | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, member_key, household:households(id, name, invite_code)")
    .eq("user_id", user.id)
    .maybeSingle();

  const household = Array.isArray(membership?.household) ? membership?.household[0] : membership?.household;
  const householdId = (membership?.household_id as string | undefined) ?? null;

  let members: WorkspaceMember[] = [];
  if (householdId) {
    const [{ data: rows }, { data: profiles }] = await Promise.all([
      supabase.from("household_members").select("user_id, member_key").eq("household_id", householdId),
      supabase.from("profiles").select("id, full_name, email").eq("household_id", householdId),
    ]);

    members = (rows ?? []).map((row) => {
      const profile = (profiles ?? []).find((p) => p.id === row.user_id);
      return {
        user_id: row.user_id as string,
        member_key: row.member_key as MemberOwner,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? null,
      };
    });
  }

  const memberKey = (membership?.member_key as MemberOwner | undefined) ?? "eki";
  const me = members.find((m) => m.user_id === user.id);
  const displayName = me?.full_name || user.email?.split("@")[0] || "Kita";

  const names = ["eki", "dinda"]
    .map((key) => members.find((m) => m.member_key === key))
    .filter(Boolean)
    .map((m) => m!.full_name || (m!.member_key === "eki" ? "Eki" : "Dinda"));

  const member1Name = members.find((m) => m.member_key === "eki")?.full_name || "Eki";
  const member2Name = members.find((m) => m.member_key === "dinda")?.full_name || "Dinda";

  return {
    householdId,
    householdName: (household?.name as string | undefined) ?? "KITA",
    inviteCode: (household?.invite_code as string | undefined) ?? null,
    memberKey,
    members,
    displayName,
    coupleName: names.length ? names.join(" & ") : displayName,
    member1Name,
    member2Name,
  };
});
