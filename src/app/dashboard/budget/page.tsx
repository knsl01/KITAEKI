import { redirect } from "next/navigation";

// Pos dibuat dan dikelola langsung dari kartu akun.
export default function BudgetPage() {
  redirect("/dashboard/accounts");
}
