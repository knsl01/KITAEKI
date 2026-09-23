export type NudgePriority = "attention" | "worth-knowing" | "helpful";
export type NudgeKind = "actionable" | "positive" | "informational" | "warning";
export type NudgeCategory = "money" | "bills" | "targets" | "savings" | "shopping" | "cleanup";

export type Nudge = {
  id: string;
  kind: NudgeKind;
  category: NudgeCategory;
  priority: NudgePriority;
  title: string;
  description: string;
  metric?: string;
  action?: { label: string; href: string };
};

export type NudgeData = {
  today: string;
  accounts: { id: string; name: string; balance: number; owner: string }[];
  transactions: { id: string; type: string; amount: number; occurred_on: string; description: string | null; category_id: string | null; owner: string }[];
  categories: { id: string; name: string }[];
  recurring: { id: string; description: string | null; amount: number; account_id: string | null; next_run_on: string; is_active: boolean; type: string; owner: string }[];
  goals: { id: string; name: string; target_amount: number; current_amount: number; target_date: string | null; owner: string }[];
  allocations: { id: string; account_id: string | null; target_amount: number; allocated_amount: number; updated_at: string }[];
  shopping: { id: string; name: string; estimated_price: number | null; is_bought: boolean; assigned_to: string }[];
  planner: { id: string; title: string; due_on: string | null; is_done: boolean; assigned_to: string }[];
};
