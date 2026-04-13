// ── Primitives ────────────────────────────────────────────────────────────────
export type UUID = string;
export type ISODateString = string;
export type CurrencyCode = string;
export type ModuleKey =
  | "finance_core"
  | "ar"
  | "ap"
  | "payroll"
  | "leave"
  | "banking"
  | "catalog"
  | "billing"
  | "inventory"
  | "reporting"
  | "budgeting"
  | "forecasting";

// ── Tenant and Entity ─────────────────────────────────────────────────────────
export interface Tenant {
  id: UUID;
  slug: string;
  legalName: string;
  displayName: string;
  timezone: string;
  status: "active" | "suspended" | "inactive";
  createdAt: ISODateString;
}

export interface Entity {
  id: UUID;
  tenantId: UUID;
  code: string;
  legalName: string;
  displayName: string;
  entityType: string;
  baseCurrency: CurrencyCode;
  status: "active" | "inactive";
}

export interface Branch {
  id: UUID;
  tenantId: UUID;
  entityId: UUID;
  code: string;
  name: string;
  status: "active" | "inactive";
}

export interface Department {
  id: UUID;
  tenantId: UUID;
  entityId: UUID;
  code: string;
  name: string;
  status: "active" | "inactive";
}

// ── Users and Access ──────────────────────────────────────────────────────────
export interface PlatformUser {
  id: UUID;
  authUserId: UUID;
  fullName: string;
  email: string;
  status: "active" | "inactive";
}

export interface TenantMembership {
  id: UUID;
  tenantId: UUID;
  platformUserId: UUID;
  membershipStatus: "active" | "suspended" | "revoked";
  defaultEntityId: UUID | null;
  joinedAt: ISODateString;
}

// ── Finance Core ──────────────────────────────────────────────────────────────
export interface Account {
  id: UUID;
  tenantId: UUID;
  entityId: UUID;
  accountCategoryId: UUID;
  code: string;
  name: string;
  description?: string | null;
  accountType: string;
  normalBalance: "debit" | "credit";
  allowPosting: boolean;
  isActive: boolean;
  parentAccountId: UUID | null;
}

export interface FiscalPeriod {
  id: UUID;
  tenantId: UUID;
  entityId: UUID;
  periodName: string;
  startDate: ISODateString;
  endDate: ISODateString;
  fiscalYear: number;
  fiscalMonth: number | null;
  status: "open" | "closed" | "locked";
}

export interface JournalEntry {
  id: UUID;
  tenantId: UUID;
  entityId: UUID;
  referenceNumber: string;
  description: string;
  entryDate: ISODateString;
  fiscalPeriodId: UUID;
  status: "draft" | "posted" | "reversed";
  sourceModule: ModuleKey;
  postedAt: ISODateString | null;
}

// ── AR / AP ───────────────────────────────────────────────────────────────────
export interface Customer {
  id: UUID;
  tenantId: UUID;
  entityId: UUID;
  customerCode: string;
  displayName: string;
  status: "active" | "inactive" | "on_hold";
}

export interface Vendor {
  id: UUID;
  tenantId: UUID;
  entityId: UUID;
  vendorCode: string;
  displayName: string;
  status: "active" | "inactive";
}

export interface Invoice {
  id: UUID;
  tenantId: UUID;
  entityId: UUID;
  customerId: UUID;
  invoiceNumber: string;
  invoiceDate: ISODateString;
  dueDate: ISODateString;
  status: "draft" | "issued" | "partial" | "paid" | "voided";
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  currency: CurrencyCode;
}

// ── Payroll ───────────────────────────────────────────────────────────────────
export interface PayrollRun {
  id: UUID;
  tenantId: UUID;
  entityId: UUID;
  payGroupId: UUID;
  payPeriodId: UUID;
  status:
    | "draft"
    | "calculating"
    | "review"
    | "approved"
    | "processing"
    | "completed"
    | "reversed";
  totalGross: number;
  totalNet: number;
  totalEmployerTax: number;
  processedAt: ISODateString | null;
}
