"use server";

import { revalidatePath } from "next/cache";
import { getUserClient, NO_HOUSEHOLD, UNAUTH, type ActionResult } from "./_shared";
import type { TransactionType, MemberOwner } from "@/lib/types";

import { pushActivity, rupiah } from "@/lib/push";

export async function aiExecuteTool(toolName: string, args: any): Promise<ActionResult & { data?: any }> {
  const session = await getUserClient();
  const { supabase, user, householdId } = session;
  if (!user) return { ok: false, error: UNAUTH };
  if (!householdId) return { ok: false, error: NO_HOUSEHOLD };

  try {
    switch (toolName) {
      case "add_income":
      case "add_expense": {
        const type: TransactionType = toolName === "add_income" ? "income" : "expense";
        const { amount, account_id, category_id, date, owner, title } = args;
        let budgetPostId: string | null = null;
        if (type === "expense" && account_id && category_id) {
          const { data: post, error: postError } = await supabase.from("account_allocations")
            .select("id").eq("household_id", householdId).eq("account_id", account_id).eq("category_id", category_id).maybeSingle();
          if (postError) throw postError;
          budgetPostId = post?.id ?? null;
        }
        
        const { error } = await supabase.from("transactions").insert({
          household_id: householdId,
          user_id: user.id,
          type,
          amount,
          account_id,
          category_id: category_id || null,
          budget_post_id: budgetPostId,
          occurred_on: date,
          owner: owner || "shared",
          description: title,
        });
        if (error) throw error;
        
        // Kirim notifikasi (tidak pernah menggagalkan aksi)
        await pushActivity(session, ({ who }) => ({
          title: type === "income" ? "💰 Pemasukan baru" : "💸 Pengeluaran baru",
          body: `${who} (via KITA AI): ${title ? `${title} · ` : ""}${rupiah(Number(amount))}`,
          url: "/dashboard/transactions",
        }));

        revalidatePath("/dashboard", "layout");
        return { ok: true, data: "Transaction added successfully." };
      }
      
      case "delete_transaction": {
        const { error } = await supabase
          .from("transactions")
          .delete()
          .eq("id", args.id)
          .eq("household_id", householdId);
        if (error) throw error;
        revalidatePath("/dashboard", "layout");
        return { ok: true, data: "Transaction deleted successfully." };
      }

      case "update_transaction": {
        const { id, ...updates } = args;
        let budgetPostId: string | null = null;
        const { data: previousTransaction, error: previousError } = await supabase.from("transactions").select("type").eq("id", id).eq("household_id", householdId).maybeSingle();
        if (previousError) throw previousError;
        if (previousTransaction?.type === "expense" && updates.account_id && updates.category_id) {
          const { data: post, error: postError } = await supabase.from("account_allocations")
            .select("id").eq("household_id", householdId).eq("account_id", updates.account_id).eq("category_id", updates.category_id).maybeSingle();
          if (postError) throw postError;
          budgetPostId = post?.id ?? null;
        }
        const { error } = await supabase
          .from("transactions")
          .update({
            amount: updates.amount,
            account_id: updates.account_id,
            category_id: updates.category_id || null,
            budget_post_id: budgetPostId,
            occurred_on: updates.date,
            owner: updates.owner,
            description: updates.title,
          })
          .eq("id", id)
          .eq("household_id", householdId);
        if (error) throw error;
        revalidatePath("/dashboard", "layout");
        return { ok: true, data: "Transaction updated successfully." };
      }

      case "create_savings_goal": {
        const { error } = await supabase.from("savings_goals").insert({
          household_id: householdId,
          user_id: user.id,
          name: args.name,
          target_amount: args.target_amount,
          target_date: args.target_date,
          owner: args.owner || "shared",
        });
        if (error) throw error;
        revalidatePath("/dashboard", "layout");
        return { ok: true, data: "Savings goal created successfully." };
      }

      case "create_event":
      case "create_trip": {
        const { error } = await supabase.from("tasks").insert({
          household_id: householdId,
          created_by: user.id,
          title: args.title,
          due_on: args.date,
          assigned_to: args.owner || "shared",
        });
        if (error) throw error;
        revalidatePath("/dashboard", "layout");
        return { ok: true, data: "Event/Trip created successfully." };
      }

      case "update_event": {
        const { error } = await supabase
          .from("tasks")
          .update({
            title: args.title,
            due_on: args.date,
            assigned_to: args.owner,
          })
          .eq("id", args.id)
          .eq("household_id", householdId);
        if (error) throw error;
        revalidatePath("/dashboard", "layout");
        return { ok: true, data: "Event updated successfully." };
      }

      case "delete_event": {
        const { error } = await supabase
          .from("tasks")
          .delete()
          .eq("id", args.id)
          .eq("household_id", householdId);
        if (error) throw error;
        revalidatePath("/dashboard", "layout");
        return { ok: true, data: "Event deleted successfully." };
      }

      default:
        return { ok: false, error: "Unknown tool: " + toolName };
    }
  } catch (e: any) {
    return { ok: false, error: e.message || "Failed to execute tool" };
  }
}
