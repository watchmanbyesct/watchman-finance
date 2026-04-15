/**
 * Watchman by ESCT is a product developed by Owens F. Shepard for ESCT Holdings Inc.
 * Copyright (c) 2026 ESCT Holdings Inc. All rights reserved.
 * Proprietary and confidential software.
 */

"use server";

import { createSupabaseAdminClient } from "@/lib/db/supabase-server";
import { resolveRequestContext } from "@/lib/context/resolve-request-context";
import { requirePermission, requireEntityScope, requireModuleEntitlement } from "@/lib/permissions/require-permission";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { mapErrorToResult, type ActionResult } from "@/lib/errors/app-error";
import { z } from "zod";

const CreateBankAccountSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  accountName: z.string().min(1),
  bankName: z.string().min(1),
  accountType: z.enum(["operating", "payroll", "tax", "savings", "other"]),
  accountNumberLast4: z.string().max(4).optional(),
  routingNumberLast4: z.string().max(4).optional(),
  currencyCode: z.string().length(3).default("USD"),
});

const SeedBankAccountsSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
});

/** Permission: banking.account.manage */
export async function createBankAccount(
  input: z.infer<typeof CreateBankAccountSchema>
): Promise<ActionResult<{ bankAccountId: string }>> {
  try {
    const validated = CreateBankAccountSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "banking");
    requirePermission(ctx, "banking.account.manage");
    requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("bank_accounts")
      .insert({
        tenant_id: validated.tenantId,
        entity_id: validated.entityId,
        account_name: validated.accountName,
        bank_name: validated.bankName,
        account_type: validated.accountType,
        account_number_last4: validated.accountNumberLast4 ?? null,
        routing_number_last4: validated.routingNumberLast4 ?? null,
        currency_code: validated.currencyCode,
        is_active: true,
        allow_incoming: true,
        allow_outgoing: true,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "banking",
      actionCode: "bank.account.create",
      targetTable: "bank_accounts",
      targetRecordId: row.id,
      newValues: { accountName: validated.accountName },
    });

    return { success: true, message: "Bank account created.", data: { bankAccountId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

type BankAccountSeedTemplate = {
  accountName: string;
  bankName: string;
  accountType: "operating" | "payroll" | "tax" | "savings" | "other";
  accountNumberLast4: string;
  routingNumberLast4: string;
};

const DEFAULT_BANK_ACCOUNTS: BankAccountSeedTemplate[] = [
  {
    accountName: "Operating Account",
    bankName: "Primary Bank",
    accountType: "operating",
    accountNumberLast4: "1001",
    routingNumberLast4: "0210",
  },
  {
    accountName: "Payroll Account",
    bankName: "Primary Bank",
    accountType: "payroll",
    accountNumberLast4: "1002",
    routingNumberLast4: "0210",
  },
  {
    accountName: "Tax Reserve Account",
    bankName: "Primary Bank",
    accountType: "tax",
    accountNumberLast4: "1003",
    routingNumberLast4: "0210",
  },
];

/**
 * Seed default bank accounts for an entity.
 * Permission: banking.account.manage
 */
export async function seedBankAccounts(
  input: z.infer<typeof SeedBankAccountsSchema>
): Promise<ActionResult<{ seededCount: number; skippedCount: number }>> {
  try {
    const validated = SeedBankAccountsSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "banking");
    requirePermission(ctx, "banking.account.manage");
    requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();
    const { data: existing, error: existingErr } = await admin
      .from("bank_accounts")
      .select("account_name, bank_name")
      .eq("tenant_id", validated.tenantId)
      .eq("entity_id", validated.entityId);

    if (existingErr) throw new Error(existingErr.message);

    const existingKey = new Set(
      (existing ?? []).map((r: { account_name: string; bank_name: string }) => `${r.bank_name}::${r.account_name}`)
    );

    const inserts = DEFAULT_BANK_ACCOUNTS.filter(
      (a) => !existingKey.has(`${a.bankName}::${a.accountName}`)
    ).map((a) => ({
      tenant_id: validated.tenantId,
      entity_id: validated.entityId,
      account_name: a.accountName,
      bank_name: a.bankName,
      account_type: a.accountType,
      account_number_last4: a.accountNumberLast4,
      routing_number_last4: a.routingNumberLast4,
      currency_code: "USD",
      is_active: true,
      allow_incoming: true,
      allow_outgoing: true,
    }));

    if (inserts.length) {
      const { error: insErr } = await admin.from("bank_accounts").insert(inserts);
      if (insErr) throw new Error(insErr.message);
    }

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "banking",
      actionCode: "bank.account.seed_default",
      targetTable: "bank_accounts",
      newValues: { seeded: inserts.length, skipped: DEFAULT_BANK_ACCOUNTS.length - inserts.length },
    });

    return {
      success: true,
      message: inserts.length
        ? `Seeded ${inserts.length} default bank account(s).`
        : "No new bank accounts to seed.",
      data: { seededCount: inserts.length, skippedCount: DEFAULT_BANK_ACCOUNTS.length - inserts.length },
    };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const ImportBankTransactionSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  bankAccountId: z.string().uuid(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  postedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  transactionType: z.enum(["debit", "credit", "fee", "transfer", "other"]),
  amount: z.number(),
  description: z.string().min(1),
  referenceNumber: z.string().optional(),
  statementCycleKey: z.string().optional(),
});

/** Permission: banking.transaction.import */
export async function importBankTransaction(
  input: z.infer<typeof ImportBankTransactionSchema>
): Promise<ActionResult<{ bankTransactionId: string }>> {
  try {
    const validated = ImportBankTransactionSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "banking");
    requirePermission(ctx, "banking.transaction.import");
    requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();

    const { data: acct, error: ae } = await admin
      .from("bank_accounts")
      .select("id")
      .eq("id", validated.bankAccountId)
      .eq("tenant_id", validated.tenantId)
      .eq("entity_id", validated.entityId)
      .single();

    if (ae || !acct) {
      return { success: false, message: "Bank account not found for this entity." };
    }

    const { data: row, error } = await admin
      .from("bank_transactions")
      .insert({
        tenant_id: validated.tenantId,
        entity_id: validated.entityId,
        bank_account_id: validated.bankAccountId,
        transaction_date: validated.transactionDate,
        posted_date: validated.postedDate ?? null,
        transaction_type: validated.transactionType,
        amount: validated.amount,
        description: validated.description,
        reference_number: validated.referenceNumber ?? null,
        source_type: "import",
        match_status: "unmatched",
        statement_cycle_key: validated.statementCycleKey ?? null,
        metadata_json: {},
        created_by: ctx.platformUserId,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "banking",
      actionCode: "bank.transaction.import",
      targetTable: "bank_transactions",
      targetRecordId: row.id,
      newValues: { amount: validated.amount },
    });

    return { success: true, message: "Bank transaction recorded.", data: { bankTransactionId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateReconciliationSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  bankAccountId: z.string().uuid(),
  reconciliationName: z.string().min(1),
  statementStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  statementEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  statementEndingBalance: z.number(),
});

/** Permission: banking.reconciliation.create */
export async function createReconciliation(
  input: z.infer<typeof CreateReconciliationSchema>
): Promise<ActionResult<{ reconciliationId: string }>> {
  try {
    const validated = CreateReconciliationSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "banking");
    requirePermission(ctx, "banking.reconciliation.create");
    requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();

    const { data: acct, error: ae } = await admin
      .from("bank_accounts")
      .select("id")
      .eq("id", validated.bankAccountId)
      .eq("tenant_id", validated.tenantId)
      .eq("entity_id", validated.entityId)
      .single();

    if (ae || !acct) {
      return { success: false, message: "Bank account not found for this entity." };
    }

    const stmtBal = validated.statementEndingBalance;
    const { data: row, error } = await admin
      .from("reconciliations")
      .insert({
        tenant_id: validated.tenantId,
        entity_id: validated.entityId,
        bank_account_id: validated.bankAccountId,
        reconciliation_name: validated.reconciliationName,
        statement_start_date: validated.statementStartDate,
        statement_end_date: validated.statementEndDate,
        statement_ending_balance: stmtBal,
        book_ending_balance: 0,
        unreconciled_difference: stmtBal,
        reconciliation_status: "draft",
        prepared_by: ctx.platformUserId,
        prepared_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "banking",
      actionCode: "bank.reconciliation.create",
      targetTable: "reconciliations",
      targetRecordId: row.id,
      newValues: { reconciliationName: validated.reconciliationName },
    });

    return { success: true, message: "Reconciliation draft created.", data: { reconciliationId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const MatchBankTransactionSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  reconciliationId: z.string().uuid(),
  bankTransactionId: z.string().uuid(),
  matchAmount: z.number(),
  invoicePaymentId: z.string().uuid().optional(),
  vendorPaymentId: z.string().uuid().optional(),
});

/** Permission: banking.reconciliation.create */
export async function matchBankTransaction(
  input: z.infer<typeof MatchBankTransactionSchema>
): Promise<ActionResult<{ receiptMatchId: string }>> {
  try {
    const validated = MatchBankTransactionSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "banking");
    requirePermission(ctx, "banking.reconciliation.create");
    requireEntityScope(ctx, validated.entityId);

    const admin = createSupabaseAdminClient();

    const { data: recon, error: re } = await admin
      .from("reconciliations")
      .select("id, reconciliation_status")
      .eq("id", validated.reconciliationId)
      .eq("tenant_id", validated.tenantId)
      .eq("entity_id", validated.entityId)
      .single();

    if (re || !recon) return { success: false, message: "Reconciliation not found." };
    if (!["draft", "in_review"].includes(recon.reconciliation_status)) {
      return { success: false, message: "Reconciliation is not open for matching." };
    }

    const { data: tx, error: te } = await admin
      .from("bank_transactions")
      .select("id, entity_id")
      .eq("id", validated.bankTransactionId)
      .eq("tenant_id", validated.tenantId)
      .single();

    if (te || !tx || tx.entity_id !== validated.entityId) {
      return { success: false, message: "Bank transaction not found for this entity." };
    }

    const { error: le } = await admin.from("reconciliation_lines").upsert(
      {
        tenant_id: validated.tenantId,
        reconciliation_id: validated.reconciliationId,
        bank_transaction_id: validated.bankTransactionId,
        line_status: "matched",
        matched_amount: validated.matchAmount,
      },
      { onConflict: "reconciliation_id,bank_transaction_id" }
    );

    if (le) throw new Error(le.message);

    const { data: matchRow, error: me } = await admin
      .from("receipt_matches")
      .insert({
        tenant_id: validated.tenantId,
        entity_id: validated.entityId,
        bank_transaction_id: validated.bankTransactionId,
        invoice_payment_id: validated.invoicePaymentId ?? null,
        vendor_payment_id: validated.vendorPaymentId ?? null,
        match_amount: validated.matchAmount,
        match_status: "matched",
        created_by: ctx.platformUserId,
      })
      .select("id")
      .single();

    if (me) throw new Error(me.message);

    const { error: ue } = await admin
      .from("bank_transactions")
      .update({ match_status: "matched" })
      .eq("id", validated.bankTransactionId);

    if (ue) throw new Error(ue.message);

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "banking",
      actionCode: "bank.transaction.match",
      targetTable: "receipt_matches",
      targetRecordId: matchRow.id,
      newValues: { matchAmount: validated.matchAmount },
    });

    return { success: true, message: "Transaction matched.", data: { receiptMatchId: matchRow.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/** Permission: banking.reconciliation.approve */
export async function approveReconciliation(input: {
  tenantId: string;
  entityId: string;
  reconciliationId: string;
}): Promise<ActionResult<{ reconciliationId: string }>> {
  try {
    const ctx = await resolveRequestContext(input.tenantId);
    requireModuleEntitlement(ctx, "banking");
    requirePermission(ctx, "banking.reconciliation.approve");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();

    const { data: recon, error: fe } = await admin
      .from("reconciliations")
      .select("reconciliation_status")
      .eq("id", input.reconciliationId)
      .eq("tenant_id", input.tenantId)
      .eq("entity_id", input.entityId)
      .single();

    if (fe || !recon) return { success: false, message: "Reconciliation not found." };
    if (!["draft", "in_review"].includes(recon.reconciliation_status)) {
      return { success: false, message: "Only draft or in-review reconciliations can be approved." };
    }

    const { error } = await admin
      .from("reconciliations")
      .update({
        reconciliation_status: "approved",
        approved_by: ctx.platformUserId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", input.reconciliationId);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: input.tenantId,
      entityId: input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "banking",
      actionCode: "bank.reconciliation.approve",
      targetTable: "reconciliations",
      targetRecordId: input.reconciliationId,
      newValues: { status: "approved" },
    });

    return { success: true, message: "Reconciliation approved.", data: { reconciliationId: input.reconciliationId } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/** Permission: banking.reconciliation.close */
export async function closeReconciliation(input: {
  tenantId: string;
  entityId: string;
  reconciliationId: string;
}): Promise<ActionResult<{ reconciliationId: string }>> {
  try {
    const ctx = await resolveRequestContext(input.tenantId);
    requireModuleEntitlement(ctx, "banking");
    requirePermission(ctx, "banking.reconciliation.close");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();

    const { data: recon, error: fe } = await admin
      .from("reconciliations")
      .select("reconciliation_status")
      .eq("id", input.reconciliationId)
      .eq("tenant_id", input.tenantId)
      .eq("entity_id", input.entityId)
      .single();

    if (fe || !recon) return { success: false, message: "Reconciliation not found." };
    if (recon.reconciliation_status !== "approved") {
      return { success: false, message: "Only approved reconciliations can be closed." };
    }

    const { error } = await admin
      .from("reconciliations")
      .update({
        reconciliation_status: "closed",
        closed_by: ctx.platformUserId,
        closed_at: new Date().toISOString(),
      })
      .eq("id", input.reconciliationId);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: input.tenantId,
      entityId: input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "banking",
      actionCode: "bank.reconciliation.close",
      targetTable: "reconciliations",
      targetRecordId: input.reconciliationId,
      newValues: { status: "closed" },
    });

    return { success: true, message: "Reconciliation closed.", data: { reconciliationId: input.reconciliationId } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

const CreateTransferRequestSchema = z.object({
  tenantId: z.string().uuid(),
  entityId: z.string().uuid(),
  fromBankAccountId: z.string().uuid(),
  toBankAccountId: z.string().uuid(),
  requestedAmount: z.number().positive(),
  transferDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  requestReason: z.string().optional(),
});

/** Permission: banking.transfer.create */
export async function createTransferRequest(
  input: z.infer<typeof CreateTransferRequestSchema>
): Promise<ActionResult<{ transferRequestId: string }>> {
  try {
    const validated = CreateTransferRequestSchema.parse(input);
    const ctx = await resolveRequestContext(validated.tenantId);
    requireModuleEntitlement(ctx, "banking");
    requirePermission(ctx, "banking.transfer.create");
    requireEntityScope(ctx, validated.entityId);

    if (validated.fromBankAccountId === validated.toBankAccountId) {
      return { success: false, message: "From and to bank accounts must differ." };
    }

    const admin = createSupabaseAdminClient();

    const { data: accounts, error: ae } = await admin
      .from("bank_accounts")
      .select("id")
      .eq("tenant_id", validated.tenantId)
      .eq("entity_id", validated.entityId)
      .in("id", [validated.fromBankAccountId, validated.toBankAccountId]);

    if (ae) throw new Error(ae.message);
    if (!accounts || accounts.length !== 2) {
      return { success: false, message: "Both bank accounts must belong to this entity." };
    }

    const { data: row, error } = await admin
      .from("transfer_requests")
      .insert({
        tenant_id: validated.tenantId,
        entity_id: validated.entityId,
        from_bank_account_id: validated.fromBankAccountId,
        to_bank_account_id: validated.toBankAccountId,
        requested_amount: validated.requestedAmount,
        transfer_date: validated.transferDate ?? null,
        transfer_status: "submitted",
        request_reason: validated.requestReason ?? null,
        requested_by: ctx.platformUserId,
        requested_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: validated.tenantId,
      entityId: validated.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "banking",
      actionCode: "bank.transfer.create",
      targetTable: "transfer_requests",
      targetRecordId: row.id,
      newValues: { requestedAmount: validated.requestedAmount },
    });

    return { success: true, message: "Transfer request submitted.", data: { transferRequestId: row.id } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}

/** Permission: banking.transfer.approve */
export async function approveTransferRequest(input: {
  tenantId: string;
  entityId: string;
  transferRequestId: string;
}): Promise<ActionResult<{ transferRequestId: string }>> {
  try {
    const ctx = await resolveRequestContext(input.tenantId);
    requireModuleEntitlement(ctx, "banking");
    requirePermission(ctx, "banking.transfer.approve");
    requireEntityScope(ctx, input.entityId);

    const admin = createSupabaseAdminClient();

    const { data: tr, error: fe } = await admin
      .from("transfer_requests")
      .select("transfer_status")
      .eq("id", input.transferRequestId)
      .eq("tenant_id", input.tenantId)
      .eq("entity_id", input.entityId)
      .single();

    if (fe || !tr) return { success: false, message: "Transfer request not found." };
    if (tr.transfer_status !== "submitted") {
      return { success: false, message: "Only submitted transfer requests can be approved." };
    }

    const { error } = await admin
      .from("transfer_requests")
      .update({
        transfer_status: "approved",
        approved_by: ctx.platformUserId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", input.transferRequestId);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      tenantId: input.tenantId,
      entityId: input.entityId,
      actorPlatformUserId: ctx.platformUserId,
      moduleKey: "banking",
      actionCode: "bank.transfer.approve",
      targetTable: "transfer_requests",
      targetRecordId: input.transferRequestId,
      newValues: { status: "approved" },
    });

    return { success: true, message: "Transfer request approved.", data: { transferRequestId: input.transferRequestId } };
  } catch (err) {
    return mapErrorToResult(err);
  }
}
