/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

import accountCategorySeed from "@/lib/finance/data/account-category-seed.json";

export type AccountCategorySeedRow = {
  code: string;
  name: string;
  category_type: "asset" | "liability" | "equity" | "revenue" | "expense";
  normal_balance: "debit" | "credit";
  integration_account_type: string;
};

export const ACCOUNT_CATEGORY_SEED_ROWS = accountCategorySeed as AccountCategorySeedRow[];
