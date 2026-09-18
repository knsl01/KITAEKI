import { TasksClient } from "@/components/views/tasks-client";
import { createClient } from "@/lib/supabase/server";
import type { Task } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tugas — KITA" };

export default async function TasksPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });

  return <TasksClient tasks={(data ?? []) as Task[]} />;
}
