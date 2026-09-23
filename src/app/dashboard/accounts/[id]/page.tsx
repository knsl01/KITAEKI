import { redirect } from "next/navigation";

export default function AccountDetailRedirect() {
  redirect("/dashboard/accounts");
}
