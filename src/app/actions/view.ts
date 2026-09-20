"use server";

import { cookies } from "next/headers";
import type { ViewKey } from "@/components/member-switcher";

export async function setGlobalView(view: ViewKey) {
  const cookieStore = await cookies();
  if (view === "bersama") {
    cookieStore.delete("kita_view");
  } else {
    cookieStore.set("kita_view", view, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
}
