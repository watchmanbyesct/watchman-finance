# Watchman Finance Production Rollback Decision Sheet
## Release Groups A Through E

## 1. Purpose

This document provides the formal rollback decision structure for Watchman Finance production releases.

It is intended to support:
- controlled rollback decisions
- production incident response
- release-governance discipline
- finance-system recovery planning
- executive and operational signoff
- audit-ready decision logging

## 2. Use of This Document

This sheet should be completed whenever:
- a production release group is deployed
- a post-deployment issue threatens financial integrity, security, or controlled operations
- leadership must determine whether to continue, pause, roll back, or apply a forward fix
- a release failure or degradation requires formal documentation

This sheet is not a substitute for technical recovery procedures. It is the decision and governance record that should accompany those procedures.

## 3. Rollback Decision Principles

Watchman Finance rollback decisions should follow these principles:

### 3.1 Protect financial integrity first
If there is credible risk to payroll, receivables, payables, reconciliation, inventory accountability, permissions, or audit integrity, rollback must be considered immediately.

### 3.2 Do not improvise production recovery
Rollback and recovery should follow approved release governance, not ad hoc manual reactions.

### 3.3 Prefer restore-based rollback for serious multi-pack failure
Where schema, data integrity, or permissions are materially compromised, restore-based recovery may be safer than piecemeal manual edits.

### 3.4 Prefer forward fix only when risk is controlled
A forward fix should only be chosen when:
- the issue is understood
- financial risk is low or contained
- tenant and entity isolation remain intact
- audit integrity remains intact
- the fix can be applied quickly and safely

### 3.5 Document every rollback decision
Every go-live disruption, rollback choice, forward-fix choice, and recovery action should be documented.

## 4. Decision Authorities

Rollback decisions should involve the following roles as applicable:

- Executive Sponsor
- Product Owner
- Technical Owner
- Finance Owner
- Compliance Owner
- QA and Release Owner
- HR and Workforce Owner for payroll-related releases
- Operations Owner for billing, inventory, or operational integration releases

## 5. Rollback Decision Categories

Use one of the following decision categories:

### 5.1 Continue Release
The issue is minor, non-blocking, and does not affect financial control, security, or data integrity.

### 5.2 Continue with Hotfix
The issue requires immediate correction, but rollback is not necessary because the system remains controlled and safe.

### 5.3 Partial Rollback
A contained rollback is required for a specific route, module, feature flag, deployment unit, or release artifact.

### 5.4 Full Rollback
The release group must be rolled back because risk is material and continued operation is not acceptable.

### 5.5 Restore-Based Recovery
The system requires environment or database restore-based recovery due to data integrity, permission, migration, or financial-control risk.

## 6. Rollback Triggers

A rollback decision should be strongly considered when any of the following occurs:

- payroll calculation or payroll finalization failure
- permission failure exposing unauthorized data
- tenant or entity isolation failure
- audit log failure for material finance actions
- invoice, bill, or reconciliation workflow corruption
- critical migration failure
- data mapping or promotion corruption from Launch or Operations
- bank matching or reconciliation corruption
- inventory or asset accountability corruption
- dashboard or report errors that materially misstate critical operational finance outputs
- release artifact failure that blocks controlled use of the module

## 7. Severity Levels

### Critical
Immediate rollback or restore consideration required.

Examples:
- cross-tenant data exposure
- payroll output corruption
- missing audit logs on material finance actions
- destructive migration behavior
- bank reconciliation corruption
- financial posting or balance corruption

### High
Strong rollback or hotfix consideration required.

Examples:
- major workflow blocked for key finance users
- high-risk permissions failure with contained exposure
- invoice or bill workflow failure without data loss
- leave or payroll integration breakdown with controlled containment

### Medium
Hotfix or controlled continuation may be acceptable.

Examples:
- non-critical reporting defect
- workflow inconvenience with workaround
- limited admin-only issue not affecting financial integrity

### Low
Rollback generally not required.

Examples:
- UI defect
- formatting issue
- low-impact usability issue

## 8. Decision Sheet Template

## 8.1 Release Identification
**Release Group:**  
**Release Code:**  
**Environment:**  
**Deployment Date and Time:**  
**Deployment Owner:**  
**Included Packs:**  
**Included Modules:**  

## 8.2 Incident Summary
**Incident Detected At:**  
**Detected By:**  
**Issue Summary:**  
**Affected Module(s):**  
**Affected Tenant(s):**  
**Affected Entity or Entities:**  
**Current Severity:**  
**Is Financial Integrity at Risk? Yes / No**  
**Is Security or Permission Integrity at Risk? Yes / No**  
**Is Audit Integrity at Risk? Yes / No**

## 8.3 User and Business Impact
**User Groups Affected:**  
**Business Functions Affected:**  
**Is Payroll Affected? Yes / No**  
**Is Billing or AR/AP Affected? Yes / No**  
**Is Banking or Reconciliation Affected? Yes / No**  
**Is Inventory or Asset Accountability Affected? Yes / No**  
**Estimated Operational Impact:**  

## 8.4 Technical Impact
**Migration Impact:**  
**Application Impact:**  
**Data Integrity Risk:**  
**Permission and RLS Risk:**  
**Audit Logging Risk:**  
**Integration Impact:**  
**Monitoring or Alert Status:**  

## 8.5 Decision Options Considered
**Option 1:** Continue release  
**Option 2:** Continue with hotfix  
**Option 3:** Partial rollback  
**Option 4:** Full rollback  
**Option 5:** Restore-based recovery  

## 8.6 Recommended Decision
**Recommended Action:**  
**Reason for Recommendation:**  
**Decision Owner:**  
**Decision Timestamp:**  

## 8.7 Approval Block
**Executive Sponsor:**  
**Product Owner:**  
**Technical Owner:**  
**Finance Owner:**  
**Compliance Owner:**  
**QA and Release Owner:**  
**Additional Required Owner(s):**  

## 8.8 Execution Record
**Rollback or Fix Started At:**  
**Execution Owner:**  
**Action Performed:**  
**Completion Time:**  
**Post-Action Validation Result:**  
**Production Status After Action:**  

## 8.9 Final Outcome
**Final Disposition:**  
**System Status:**  
**Residual Risk:**  
**Further Actions Required:**  
**Post-Incident Review Required: Yes / No**

## 9. Release Group Guidance

## Release Group A
### Areas of concern
- tenant isolation
- entity scoping
- permissions
- audit logging
- Launch and Operations intake staging

### Default rollback posture
Use a conservative rollback posture if tenant isolation, entity scope, or audit behavior is compromised.

## Release Group B
### Areas of concern
- invoices
- bills
- payroll
- leave
- bank reconciliation

### Default rollback posture
Use a conservative rollback posture for payroll, reconciliation, or financial workflow corruption. A hotfix may be acceptable only when the issue is contained and data integrity is preserved.

## Release Group C
### Areas of concern
- contract billing conversion
- pricing
- stock control
- employee issue and return
- equipment accountability

### Default rollback posture
Consider rollback when billing conversion or asset-accountability controls are materially impaired.

## Release Group D
### Areas of concern
- reporting accuracy
- dashboard snapshots
- close checklists
- budgets
- forecasts
- variance outputs

### Default rollback posture
Use caution. Reporting-only issues may allow controlled continuation if no transactional integrity risk exists. Rollback should be considered if decision-critical outputs are materially misleading.

## Release Group E
### Areas of concern
- consolidation
- intercompany readiness
- feature flags
- activation controls
- release and recovery control systems
- operational alerts

### Default rollback posture
Use rollback or restore-based recovery when release-governance, feature-flag, or recovery controls are compromised in a way that creates broader platform risk.

## 10. Rollback Evaluation Questions

The decision team should answer the following:

1. Is financial integrity at risk?
2. Is unauthorized access possible?
3. Is audit completeness compromised?
4. Can the issue be contained without rollback?
5. Is the issue isolated to one module or widespread?
6. Does a safe hotfix path exist?
7. Is production data already impacted?
8. Is restore-based recovery safer than forward fixing?
9. Are business owners comfortable continuing operations?
10. Has the rollback authority approved the chosen path?

## 11. Post-Rollback Validation Checklist

After rollback or recovery, confirm:

- route access behaves correctly
- permissions behave correctly
- tenant and entity isolation restored
- core workflows restored
- audit logging works
- monitoring shows stable condition
- no critical alerts remain open without owner assignment
- release communication sent
- incident record stored

## 12. Communication Record

Every rollback event should include communication tracking.

**Initial Notification Sent:**  
**Recipients:**  
**Executive Notification Sent:**  
**Finance Notification Sent:**  
**Operations Notification Sent:**  
**User Advisory Sent:**  
**Rollback Complete Notification Sent:**  

## 13. Required Attachments

Attach the following to the rollback record where applicable:

- release notes
- migration log
- production alert log
- smoke test results
- issue references
- rollback execution notes
- restore confirmation
- post-rollback validation notes
- communication log

## 14. Final Rule

No Watchman Finance rollback decision should be made informally.

Every decision to continue, hotfix, partially roll back, fully roll back, or restore must be:
- documented
- approved by the proper authority
- executed by an identified owner
- validated after completion
