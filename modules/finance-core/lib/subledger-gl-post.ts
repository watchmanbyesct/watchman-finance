import type { SupabaseClient } from "@supabase/supabase-js";

export type GlBindingKey =
  | "ar_receivable"
  | "ar_revenue"
  | "ar_cash_clearing"
  | "payroll_expense"
  | "payroll_liability"
  | "ap_payable"
  | "ap_expense"
  | "ap_cash_clearing";

export async function loadGlBindings(
  admin: SupabaseClient,
  tenantId: string,
  entityId: string
): Promise<Partial<Record<GlBindingKey, string>>> {
  const { data, error } = await admin
    .from("entity_gl_account_bindings")
    .select("binding_key, account_id")
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId);
  if (error) throw new Error(error.message);
  const m: Partial<Record<GlBindingKey, string>> = {};
  for (const r of data ?? []) {
    const k = r.binding_key as GlBindingKey;
    m[k] = r.account_id as string;
  }
  return m;
}

async function assertPostableAccount(
  admin: SupabaseClient,
  tenantId: string,
  entityId: string,
  accountId: string
): Promise<void> {
  const { data, error } = await admin
    .from("accounts")
    .select("id, allow_posting, is_active")
    .eq("id", accountId)
    .eq("tenant_id", tenantId)
    .eq("entity_id", entityId)
    .single();
  if (error || !data) throw new Error("GL binding account not found on entity.");
  if (!data.allow_posting || !data.is_active) {
    throw new Error("GL binding account must be active and allow posting.");
  }
}

export type SubledgerSourceEvent =
  | "invoice_issue"
  | "invoice_issue_void"
  | "invoice_payment"
  | "invoice_payment_void"
  | "payroll_finalize"
  | "payroll_finalize_reversal"
  | "bill_approve"
  | "bill_approve_void"
  | "bill_payment";

/**
 * Creates a posted GL journal batch with lines and a gl_subledger_postings row.
 * Idempotent when the same subledger key already exists.
 */
export async function createPostedSubledgerJournal(
  admin: SupabaseClient,
  params: {
    tenantId: string;
    entityId: string;
    journalNumber: string;
    journalDate: string;
    description: string | null;
    platformUserId: string | null;
    lines: { accountId: string; debit: number; credit: number; memo?: string | null }[];
    subledger: {
      sourceDomain: "ar" | "payroll" | "ap";
      sourceTable: string;
      sourceRecordId: string;
      sourceEvent: SubledgerSourceEvent;
    };
  }
): Promise<{ journalBatchId: string } | null> {
  const { data: existing } = await admin
    .from("gl_subledger_postings")
    .select("journal_batch_id")
    .eq("tenant_id", params.tenantId)
    .eq("source_table", params.subledger.sourceTable)
    .eq("source_record_id", params.subledger.sourceRecordId)
    .eq("source_event", params.subledger.sourceEvent)
    .maybeSingle();
  if (existing?.journal_batch_id) {
    return { journalBatchId: existing.journal_batch_id as string };
  }

  let totalDebit = 0;
  let totalCredit = 0;
  for (const line of params.lines) {
    const d = Number(line.debit.toFixed(2));
    const c = Number(line.credit.toFixed(2));
    if ((d > 0 && c > 0) || (d === 0 && c === 0)) {
      throw new Error("Each journal line must have either a debit or a credit amount.");
    }
    totalDebit += d;
    totalCredit += c;
    await assertPostableAccount(admin, params.tenantId, params.entityId, line.accountId);
  }
  if (params.lines.length < 2) {
    throw new Error("At least two GL lines are required for subledger posting.");
  }
  if (Number(totalDebit.toFixed(2)) !== Number(totalCredit.toFixed(2)) || totalDebit <= 0) {
    throw new Error("Subledger journal lines must balance with at least two lines.");
  }

  const { data: batch, error: be } = await admin
    .from("gl_journal_batches")
    .insert({
      tenant_id: params.tenantId,
      entity_id: params.entityId,
      fiscal_period_id: null,
      journal_number: params.journalNumber,
      journal_date: params.journalDate,
      description: params.description,
      batch_status: "draft",
      created_by: params.platformUserId,
    })
    .select("id")
    .single();

  if (be) throw new Error(be.message);

  const lineRows = params.lines.map((l, i) => ({
    tenant_id: params.tenantId,
    journal_batch_id: batch.id,
    line_number: i + 1,
    account_id: l.accountId,
    memo: l.memo ?? null,
    debit_amount: Number(l.debit.toFixed(2)),
    credit_amount: Number(l.credit.toFixed(2)),
  }));

  const { error: le } = await admin.from("gl_journal_lines").insert(lineRows);
  if (le) {
    await admin.from("gl_journal_batches").delete().eq("id", batch.id);
    throw new Error(le.message);
  }

  const now = new Date().toISOString();
  const { error: ue } = await admin
    .from("gl_journal_batches")
    .update({
      batch_status: "posted",
      posted_at: now,
      posted_by: params.platformUserId,
      updated_at: now,
    })
    .eq("id", batch.id);
  if (ue) throw new Error(ue.message);

  const { error: se } = await admin.from("gl_subledger_postings").insert({
    tenant_id: params.tenantId,
    entity_id: params.entityId,
    source_domain: params.subledger.sourceDomain,
    source_table: params.subledger.sourceTable,
    source_record_id: params.subledger.sourceRecordId,
    source_event: params.subledger.sourceEvent,
    journal_batch_id: batch.id,
  });
  if (se) throw new Error(se.message);

  return { journalBatchId: batch.id };
}

export async function tryPostArInvoiceIssueToGl(
  admin: SupabaseClient,
  ctx: { platformUserId: string | null },
  input: {
    tenantId: string;
    entityId: string;
    invoiceId: string;
    issueDate: string;
    invoiceNumber: string;
    totalAmount: number;
  }
): Promise<void> {
  const amt = Number(input.totalAmount.toFixed(2));
  if (amt <= 0) return;
  const b = await loadGlBindings(admin, input.tenantId, input.entityId);
  const ar = b.ar_receivable;
  const rev = b.ar_revenue;
  if (!ar || !rev) return;

  await createPostedSubledgerJournal(admin, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    journalNumber: `AR-INV-${input.invoiceId}`,
    journalDate: input.issueDate,
    description: `AR issue ${input.invoiceNumber}`,
    platformUserId: ctx.platformUserId,
    lines: [
      { accountId: ar, debit: amt, credit: 0, memo: `AR ${input.invoiceNumber}` },
      { accountId: rev, debit: 0, credit: amt, memo: `Revenue ${input.invoiceNumber}` },
    ],
    subledger: {
      sourceDomain: "ar",
      sourceTable: "invoices",
      sourceRecordId: input.invoiceId,
      sourceEvent: "invoice_issue",
    },
  });
}

export async function tryPostArInvoicePaymentToGl(
  admin: SupabaseClient,
  ctx: { platformUserId: string | null },
  input: {
    tenantId: string;
    entityId: string;
    paymentId: string;
    paymentDate: string;
    amountApplied: number;
    invoiceNumber?: string | null;
  }
): Promise<void> {
  const applied = Number(input.amountApplied.toFixed(2));
  if (applied <= 0) return;
  const b = await loadGlBindings(admin, input.tenantId, input.entityId);
  const ar = b.ar_receivable;
  const cash = b.ar_cash_clearing;
  if (!ar || !cash) return;

  await createPostedSubledgerJournal(admin, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    journalNumber: `AR-PAY-${input.paymentId}`,
    journalDate: input.paymentDate,
    description: `AR cash application${input.invoiceNumber ? ` — ${input.invoiceNumber}` : ""}`,
    platformUserId: ctx.platformUserId,
    lines: [
      { accountId: cash, debit: applied, credit: 0, memo: "Cash / clearing" },
      { accountId: ar, debit: 0, credit: applied, memo: "Reduce AR" },
    ],
    subledger: {
      sourceDomain: "ar",
      sourceTable: "invoice_payments",
      sourceRecordId: input.paymentId,
      sourceEvent: "invoice_payment",
    },
  });
}

export async function tryPostPayrollFinalizeToGl(
  admin: SupabaseClient,
  ctx: { platformUserId: string | null },
  input: {
    tenantId: string;
    entityId: string;
    payrollRunId: string;
    journalDate: string;
    runNumber: string | null;
    totalGross: number;
  }
): Promise<void> {
  const gross = Number(input.totalGross.toFixed(2));
  if (gross <= 0) return;
  const b = await loadGlBindings(admin, input.tenantId, input.entityId);
  const exp = b.payroll_expense;
  const liab = b.payroll_liability;
  if (!exp || !liab) return;

  await createPostedSubledgerJournal(admin, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    journalNumber: `PR-${input.payrollRunId}`,
    journalDate: input.journalDate,
    description: `Payroll accrual${input.runNumber ? ` — ${input.runNumber}` : ""}`,
    platformUserId: ctx.platformUserId,
    lines: [
      { accountId: exp, debit: gross, credit: 0, memo: "Payroll expense (gross wages)" },
      { accountId: liab, debit: 0, credit: gross, memo: "Wages payable" },
    ],
    subledger: {
      sourceDomain: "payroll",
      sourceTable: "payroll_runs",
      sourceRecordId: input.payrollRunId,
      sourceEvent: "payroll_finalize",
    },
  });
}

/**
 * Posts a reversing journal by flipping lines from the original subledger posting batch.
 * Idempotent on reversalEvent.
 */
export async function postSubledgerReversal(
  admin: SupabaseClient,
  ctx: { platformUserId: string | null },
  p: {
    tenantId: string;
    entityId: string;
    sourceDomain: "ar" | "payroll" | "ap";
    sourceTable: string;
    sourceRecordId: string;
    originalEvent: SubledgerSourceEvent;
    reversalEvent: SubledgerSourceEvent;
    journalNumber: string;
    journalDate: string;
    description: string;
  }
): Promise<void> {
  const { data: existingRev } = await admin
    .from("gl_subledger_postings")
    .select("id")
    .eq("tenant_id", p.tenantId)
    .eq("source_table", p.sourceTable)
    .eq("source_record_id", p.sourceRecordId)
    .eq("source_event", p.reversalEvent)
    .maybeSingle();
  if (existingRev) return;

  const { data: orig } = await admin
    .from("gl_subledger_postings")
    .select("journal_batch_id")
    .eq("tenant_id", p.tenantId)
    .eq("source_table", p.sourceTable)
    .eq("source_record_id", p.sourceRecordId)
    .eq("source_event", p.originalEvent)
    .maybeSingle();
  if (!orig?.journal_batch_id) return;

  const { data: lines, error: le } = await admin
    .from("gl_journal_lines")
    .select("account_id, memo, debit_amount, credit_amount, line_number")
    .eq("journal_batch_id", orig.journal_batch_id)
    .order("line_number");
  if (le) throw new Error(le.message);
  const arr = lines ?? [];
  if (arr.length < 2) return;

  const revLines = arr.map((l) => ({
    accountId: l.account_id as string,
    debit: Number(l.credit_amount),
    credit: Number(l.debit_amount),
    memo: (l.memo as string | null) ? `Rev: ${l.memo}` : "Reversal",
  }));

  await createPostedSubledgerJournal(admin, {
    tenantId: p.tenantId,
    entityId: p.entityId,
    journalNumber: p.journalNumber,
    journalDate: p.journalDate,
    description: p.description,
    platformUserId: ctx.platformUserId,
    lines: revLines,
    subledger: {
      sourceDomain: p.sourceDomain,
      sourceTable: p.sourceTable,
      sourceRecordId: p.sourceRecordId,
      sourceEvent: p.reversalEvent,
    },
  });
}

export async function tryPostArInvoiceIssueReversalGl(
  admin: SupabaseClient,
  ctx: { platformUserId: string | null },
  input: {
    tenantId: string;
    entityId: string;
    invoiceId: string;
    journalDate: string;
    invoiceNumber: string;
  }
): Promise<void> {
  await postSubledgerReversal(admin, ctx, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    sourceDomain: "ar",
    sourceTable: "invoices",
    sourceRecordId: input.invoiceId,
    originalEvent: "invoice_issue",
    reversalEvent: "invoice_issue_void",
    journalNumber: `AR-INVVOID-${input.invoiceId}`,
    journalDate: input.journalDate,
    description: `AR void reversal — ${input.invoiceNumber}`,
  });
}

export async function tryPostPayrollFinalizeReversalGl(
  admin: SupabaseClient,
  ctx: { platformUserId: string | null },
  input: {
    tenantId: string;
    entityId: string;
    payrollRunId: string;
    journalDate: string;
    runNumber: string | null;
  }
): Promise<void> {
  await postSubledgerReversal(admin, ctx, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    sourceDomain: "payroll",
    sourceTable: "payroll_runs",
    sourceRecordId: input.payrollRunId,
    originalEvent: "payroll_finalize",
    reversalEvent: "payroll_finalize_reversal",
    journalNumber: `PR-REV-${input.payrollRunId}`,
    journalDate: input.journalDate,
    description: `Payroll reversal (gross accrual)${input.runNumber ? ` — ${input.runNumber}` : ""}`,
  });
}

export async function tryPostApBillApproveToGl(
  admin: SupabaseClient,
  ctx: { platformUserId: string | null },
  input: {
    tenantId: string;
    entityId: string;
    billId: string;
    billDate: string | null;
    billNumber: string;
    totalAmount: number;
  }
): Promise<void> {
  const amt = Number(input.totalAmount.toFixed(2));
  if (amt <= 0) return;
  const b = await loadGlBindings(admin, input.tenantId, input.entityId);
  const exp = b.ap_expense;
  const ap = b.ap_payable;
  if (!exp || !ap) return;

  const jd = input.billDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  await createPostedSubledgerJournal(admin, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    journalNumber: `AP-BILL-${input.billId}`,
    journalDate: jd,
    description: `AP bill approved ${input.billNumber}`,
    platformUserId: ctx.platformUserId,
    lines: [
      { accountId: exp, debit: amt, credit: 0, memo: `Expense ${input.billNumber}` },
      { accountId: ap, debit: 0, credit: amt, memo: `AP ${input.billNumber}` },
    ],
    subledger: {
      sourceDomain: "ap",
      sourceTable: "bills",
      sourceRecordId: input.billId,
      sourceEvent: "bill_approve",
    },
  });
}

export async function tryPostApVendorPaymentToGl(
  admin: SupabaseClient,
  ctx: { platformUserId: string | null },
  input: {
    tenantId: string;
    entityId: string;
    paymentId: string;
    paymentDate: string;
    amountApplied: number;
    billNumber?: string | null;
  }
): Promise<void> {
  const applied = Number(input.amountApplied.toFixed(2));
  if (applied <= 0) return;
  const b = await loadGlBindings(admin, input.tenantId, input.entityId);
  const ap = b.ap_payable;
  const cash = b.ap_cash_clearing;
  if (!ap || !cash) return;

  await createPostedSubledgerJournal(admin, {
    tenantId: input.tenantId,
    entityId: input.entityId,
    journalNumber: `AP-PAY-${input.paymentId}`,
    journalDate: input.paymentDate,
    description: `AP vendor payment${input.billNumber ? ` — ${input.billNumber}` : ""}`,
    platformUserId: ctx.platformUserId,
    lines: [
      { accountId: ap, debit: applied, credit: 0, memo: "Reduce AP" },
      { accountId: cash, debit: 0, credit: applied, memo: "Cash / clearing" },
    ],
    subledger: {
      sourceDomain: "ap",
      sourceTable: "vendor_payments",
      sourceRecordId: input.paymentId,
      sourceEvent: "bill_payment",
    },
  });
}
