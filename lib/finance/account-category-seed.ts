import accountCategorySeed from "@/lib/finance/data/account-category-seed.json";

export type AccountCategorySeedRow = {
  code: string;
  name: string;
  category_type: "asset" | "liability" | "equity" | "revenue" | "expense";
  normal_balance: "debit" | "credit";
  qbd_account_type: string;
};

export const ACCOUNT_CATEGORY_SEED_ROWS = accountCategorySeed as AccountCategorySeedRow[];
