export type MemberOwner = "eki" | "dinda" | "shared";
export type TransactionType = "income" | "expense" | "transfer";
export type CategoryKind = "income" | "expense";
export type AccountType = "bank" | "ewallet" | "cash" | "other";
export type ItemPriority = "low" | "medium" | "high";
export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  default_owner: MemberOwner;
};

export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  owner: MemberOwner;
  initial_balance: number;
  balance: number;
  icon_key: string | null;
  household_id?: string | null;
  is_active: boolean;
  created_at: string;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  kind: CategoryKind;
  color: string;
  icon_key: string | null;
  household_id?: string | null;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  occurred_on: string;
  description: string | null;
  owner: MemberOwner;
  account_id: string | null;
  to_account_id: string | null;
  category_id: string | null;
  created_at: string;
};

export type TransactionWithRelations = Transaction & {
  account: Pick<Account, "id" | "name"> | null;
  to_account: Pick<Account, "id" | "name"> | null;
  category: Pick<Category, "id" | "name" | "color" | "kind" | "icon_key"> | null;
};

export type Budget = {
  id: string;
  user_id: string;
  category_id: string;
  account_id?: string | null;
  amount: number;
  period_month: string;
  category?: Pick<Category, "id" | "name" | "color"> | null;
};

export type AccountAllocation = {
  id: string;
  user_id: string;
  household_id: string;
  account_id: string | null;
  category_id: string;
  amount: number;
  created_at: string;
  updated_at: string;
  category?: Pick<Category, "id" | "name" | "color"> | null;
  account?: Pick<Account, "id" | "name"> | null;
};

export type SavingsGoal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  owner: MemberOwner;
  is_archived: boolean;
  image_url?: string | null;
  item_url?: string | null;
  item_price?: number | null;
  priority?: ItemPriority;
};

export type RecurringTransaction = {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  owner: MemberOwner;
  account_id: string | null;
  to_account_id: string | null;
  category_id: string | null;
  frequency: RecurringFrequency;
  next_run_on: string;
  is_active: boolean;
  is_manual: boolean;
  account?: Pick<Account, "id" | "name"> | null;
  category?: Pick<Category, "id" | "name" | "color"> | null;
};

export const OWNER_LABEL: Record<MemberOwner, string> = {
  eki: "Eki",
  dinda: "Dinda",
  shared: "KITA",
};

export const TYPE_LABEL: Record<TransactionType, string> = {
  income: "Pemasukan",
  expense: "Pengeluaran",
  transfer: "Transfer",
};

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  bank: "Bank",
  ewallet: "E-wallet",
  cash: "Tunai",
  other: "Lainnya",
};

export const FREQUENCY_LABEL: Record<RecurringFrequency, string> = {
  daily: "Harian",
  weekly: "Mingguan",
  monthly: "Bulanan",
  yearly: "Tahunan",
};

export type Task = {
  id: string;
  assigned_to: MemberOwner;
  title: string;
  detail: string | null;
  due_on: string | null;
  is_done: boolean;
  done_at: string | null;
  created_at: string;
};

export type ShoppingItem = {
  id: string;
  assigned_to: MemberOwner;
  name: string;
  quantity: string | null;
  estimated_price: number | null;
  is_bought: boolean;
  created_at: string;
};

export type WishlistItem = {
  id: string;
  owner: MemberOwner;
  name: string;
  price: number | null;
  url: string | null;
  priority: ItemPriority;
  is_purchased: boolean;
  purchased_on: string | null;
  notes: string | null;
  created_at: string;
};

export const PRIORITY_LABEL: Record<ItemPriority, string> = {
  high: "Prioritas tinggi",
  medium: "Prioritas sedang",
  low: "Prioritas rendah",
};
