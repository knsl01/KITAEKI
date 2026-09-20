import { TasksClient } from "@/components/views/tasks-client";
import { createClient } from "@/lib/supabase/server";
import { getView } from "@/lib/workspace";
import type { Task } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Calendar KITA — KITA" };

export default async function TasksPage() {
  const currentView = await getView();
  const supabase = await createClient();
  const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });

  const tasks = (data ?? []) as Task[];
  const filtered = tasks.filter((t) => currentView === "bersama" || t.assigned_to === currentView || t.assigned_to === "shared");

  return <TasksClient tasks={filtered} />;
}
