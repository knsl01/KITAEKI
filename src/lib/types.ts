export type MemberOwner = "eki" | "dinda" | "shared";
export type TransactionType = "income" | "expense" | "transfer";
export type CategoryKind = "income" | "expense";
export type AccountType = "bank" | "ewallet" | "cash" | "other";
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
  is_active: boolean;
  created_at: string;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  kind: CategoryKind;
  color: string;
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
  category: Pick<Category, "id" | "name" | "color" | "kind"> | null;
};

export type Budget = {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  period_month: string;
  category?: Pick<Category, "id" | "name" | "color"> | null;
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
  account?: Pick<Account, "id" | "name"> | null;
  category?: Pick<Category, "id" | "name" | "color"> | null;
};

export const OWNER_LABEL: Record<MemberOwner, string> = {
  eki: "Eki",
  dinda: "Dinda",
  shared: "Bersama",
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
