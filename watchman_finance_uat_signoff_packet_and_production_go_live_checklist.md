# Watchman Finance UAT Signoff Packet and Production Go-Live Checklist
## Release Groups A Through E

## 1. Purpose

This document provides the formal User Acceptance Testing, signoff, and production go-live control structure for Watchman Finance across Release Groups A through E.

It is designed to support:
- controlled user acceptance testing
- formal release approval
- production readiness validation
- finance and executive signoff
- audit-ready launch documentation
- operational handoff

## 2. Governance Basis

This packet is built on the expectation that Watchman Finance will be deployed as a governed platform with:
- tenant administration
- module-level controls
- integration health oversight
- payment reconciliation visibility
- QBO accounting support during transition
- client-facing finance views where enabled
- platform-level release and health governance

The broader Watchman navigation architecture already anticipates governed tenant setup, module governance, integration health, QBO accounting views, payment reconciliation, and client-facing contract and billing visibility, so UAT and go-live must be structured around controlled module rollout rather than informal deployment. fileciteturn10file3L1-L24

This packet also aligns with ESCT finance policy expectations that reconciliations be reviewed and approved, AR aging be reviewed weekly, budgets and reports be managed by Finance, and executive leadership provide oversight for major financial decisions. fileciteturn10file6L1-L18 Policy publication, approval, and archive discipline further support using formal signoff documents and go-live records for Watchman Finance releases. fileciteturn10file12L1-L18 Recovery policy expectations also support formal launch controls by emphasizing recovery planning, data protection, and resilience for critical financial records. fileciteturn10file15L1-L18

## 3. UAT Packet Structure

Each release group should have a UAT packet that includes:

1. release summary
2. included packs and modules
3. test scope
4. excluded scope
5. required test roles
6. test scenarios
7. pass and fail criteria
8. issue log
9. signoff section
10. go-live decision section

## 4. Required UAT Roles

The following roles should participate in UAT as applicable:

- Product Owner
- Technical Owner
- Finance Owner
- QA and Release Owner
- Compliance Owner
- HR and Workforce Owner for payroll and leave workflows
- Operations Owner for timekeeping, billing, inventory, and operational integrations
- Executive Sponsor for final approval where required

## 5. Standard UAT Entry Criteria

No release group should enter formal UAT until the following are confirmed:

- migrations applied successfully
- seed data loaded successfully
- RLS validated
- audit logging validated
- required server actions deployed
- core UI routes available for testing
- no unresolved critical schema errors
- test environment identified
- UAT test accounts provisioned
- owner assignments confirmed

## 6. Standard UAT Exit Criteria

No release group should exit UAT as approved until the following are confirmed:

- all critical scenarios passed
- all high-severity defects resolved or formally deferred
- permissions validated
- audit logging validated
- negative-path tests completed
- release notes prepared
- owner signoffs collected
- go-live decision documented

## 7. Release Group UAT Packets

## Release Group A
### Includes
- Pack 001 Foundation
- Pack 002 Integration Staging and Sync

### UAT objective
Validate the secure finance foundation and inbound data-control layer.

### Test scenarios
- tenant creation and context resolution
- entity and scope setup
- role assignment
- permission-controlled access
- audit log generation
- Launch employee staging
- Launch customer staging
- Operations time staging
- external ID mapping checks
- review queue and exception handling checks

### Required signoff
- Product Owner
- Technical Owner
- Compliance Owner
- QA and Release Owner

### Go-live gate
Approved only if tenant isolation, entity scope, audit logs, and staging behavior all perform correctly.

## Release Group B
### Includes
- Pack 003 AR and AP Core
- Pack 004 Payroll Core
- Pack 005 Leave and Accrual Management
- Pack 006 Banking and Reconciliation

### UAT objective
Validate core transactional finance, payroll, leave, and banking workflows.

### Test scenarios
- create invoice draft
- add invoice lines
- issue invoice
- record customer payment
- create bill draft
- add bill lines
- approve bill
- record vendor payment
- create pay group
- create pay profile
- create payroll run
- load approved time
- calculate payroll run
- approve payroll run
- finalize payroll run
- create leave type and leave policy
- assign leave policy
- submit leave request
- approve leave request
- run leave accruals
- create bank account
- import bank transaction
- create reconciliation
- match bank transaction
- approve reconciliation
- create and approve transfer request

### Required signoff
- Finance Owner
- HR and Workforce Owner
- Technical Owner
- QA and Release Owner
- Compliance Owner for control-sensitive workflows

### Go-live gate
Approved only if invoice, bill, payroll, leave, and reconciliation workflows all pass with correct permissions and audit trails.

## Release Group C
### Includes
- Pack 007 Products, Services, and Contract Billing
- Pack 008 Inventory and Asset Control

### UAT objective
Validate commercial setup, billing conversion, inventory control, and asset accountability.

### Test scenarios
- create catalog item
- set catalog price
- create billing rule
- generate billable candidate
- convert candidate to invoice line
- create inventory item
- receive stock
- transfer stock
- adjust stock
- assign asset
- return asset
- validate employee issue and return documentation workflow
- validate equipment incident workflow
- validate stock visibility and reorder rule setup

### Required signoff
- Product Owner
- Finance Owner
- Operations Owner
- HR and Workforce Owner for issue and return controls
- Technical Owner
- QA and Release Owner

### Go-live gate
Approved only if billing and inventory workflows produce correct financial and control outcomes.

## Release Group D
### Includes
- Pack 009 Reporting and Dashboard Foundation
- Pack 010 Budgeting and Forecasting

### UAT objective
Validate management reporting, dashboard visibility, planning controls, and variance outputs.

### Test scenarios
- create report definition
- generate report snapshot
- generate executive dashboard snapshot
- create close checklist
- complete close task
- create budget version
- upsert budget line
- submit budget version
- approve budget version
- create forecast version
- upsert forecast line
- save scenario input
- generate variance snapshot

### Required signoff
- Finance Owner
- Product Owner
- Technical Owner
- QA and Release Owner
- Executive Sponsor for dashboard and planning expectations where required

### Go-live gate
Approved only if reporting outputs are usable, planning workflows are controlled, and management visibility is accurate enough for internal use.

## Release Group E
### Includes
- Pack 011 Multi-Entity Consolidation and Commercial Readiness
- Pack 012 Hardening, QA, and Production Readiness

### UAT objective
Validate enterprise controls, commercialization readiness, release discipline, and recovery readiness.

### Test scenarios
- create consolidation group
- add entity to consolidation group
- generate consolidation snapshot
- create intercompany transaction
- run tenant bootstrap
- set tenant feature flag
- start test run
- record test result
- create release version
- approve release version
- raise operational alert
- start restore test run
- review release readiness summary
- review open operational alerts

### Required signoff
- Executive Sponsor
- Product Owner
- Finance Owner
- Compliance Owner
- Technical Owner
- QA and Release Owner

### Go-live gate
Approved only if release governance, consolidation readiness, feature-flag control, and recovery structures operate correctly.

## 8. UAT Test Record Template

Use the following structure for each UAT test case:

**Test Case ID**  
**Release Group**  
**Module**  
**Scenario Name**  
**Tester Name**  
**Date Tested**  
**Preconditions**  
**Steps Performed**  
**Expected Result**  
**Actual Result**  
**Status: Pass / Fail / Blocked**  
**Issue Reference**  
**Notes**

## 9. UAT Defect Severity Model

Use the following defect levels:

### Critical
Blocks go-live. Financial control, security, or data integrity failure.

### High
Major workflow failure. May block module rollout unless approved for deferment.

### Medium
Workflow partially impaired but controlled workaround exists.

### Low
Non-blocking defect or usability issue.

## 10. UAT Signoff Form

Each release group should include a signoff block with the following fields:

**Release Group**  
**Included Packs**  
**Environment Tested**  
**UAT Start Date**  
**UAT End Date**  
**Summary of Passed Scenarios**  
**Outstanding Issues**  
**Go-Live Recommendation: Approve / Approve with Conditions / Do Not Approve**

### Signoff roles
- Product Owner
- Technical Owner
- Finance Owner where applicable
- HR and Workforce Owner where applicable
- Operations Owner where applicable
- Compliance Owner where applicable
- QA and Release Owner
- Executive Sponsor where required

## 11. Production Go-Live Checklist

The following checklist should be completed for every production release group.

## 11.1 Change Control Readiness
Confirm:
- release group identified
- included packs listed
- release code assigned
- release notes prepared
- deployment window approved
- rollback owner assigned
- business owners notified

## 11.2 Environment Readiness
Confirm:
- target production environment verified
- backups completed
- restore point confirmed
- secrets and configs verified
- feature flags reviewed
- migration files verified
- deployment package verified

## 11.3 Data and Schema Readiness
Confirm:
- migrations already tested in lower environments
- seeds validated in lower environments
- views compile successfully
- indexes and triggers validated
- no unresolved migration blockers remain

## 11.4 Security and Permissions Readiness
Confirm:
- RLS validated in lower environments
- permission mappings verified
- no unauthorized access paths identified
- tenant and entity isolation validated
- audit logging active

## 11.5 Workflow Readiness
Confirm:
- critical workflow smoke tests identified
- post-deploy smoke tests assigned
- signoff owners available during release
- exception routing path defined
- support escalation path defined

## 11.6 Monitoring Readiness
Confirm:
- health checks reviewed
- alert routing reviewed
- job monitoring reviewed
- integration health reviewed
- logging visibility available

## 11.7 Recovery Readiness
Confirm:
- rollback decision tree documented
- restore test history reviewed
- backup verification current
- release rollback authority confirmed
- recovery communications plan confirmed

## 11.8 Final Approval Readiness
Confirm:
- UAT approved
- QA approved
- Finance approved where applicable
- Compliance approved where applicable
- Executive approval received where applicable

## 12. Production Cutover Steps

A standard production cutover sequence should be:

1. confirm release window open
2. confirm backup complete
3. confirm deployment owner present
4. apply approved migrations
5. deploy dependent application code
6. validate seed and registry state
7. run post-deploy smoke tests
8. validate monitoring and alert state
9. validate audit logging
10. collect release confirmation
11. announce go-live completion

## 13. Post-Go-Live Validation

Immediately after go-live, verify:

- route access works
- permissions work
- key workflows work
- audit logs write
- integration health is normal
- no critical alerts open
- no data corruption indicators appear
- no blocking user defects reported

## 14. Hypercare Checklist

For the first post-launch support period, confirm:

- issue intake owner assigned
- daily review cadence established
- finance owner available
- technical owner available
- release manager available
- rollback trigger threshold defined
- executive escalation path defined

## 15. Go-Live Decision Categories

Use one of the following release decisions:

### Approve
Ready for production.

### Approve with Conditions
Ready for production with documented limitations, increased monitoring, or deferred low-risk issues.

### Do Not Approve
Not ready for production.

## 16. Required Production Records

Retain the following records after each go-live:

- final UAT packet
- issue log
- signoff sheet
- release notes
- migration record
- smoke test record
- rollback plan
- go-live communication log
- post-launch issue log

This aligns with broader ESCT documentation and publication discipline, which requires approved documents to be published, versioned, retained, and made available for audit and historical review. fileciteturn10file12L1-L18

## 17. Recommended Immediate Use

This packet should now be used to produce:

1. release-group-specific UAT forms
2. signoff sheets for Finance, HR, Operations, Compliance, and Executive leadership
3. production go-live meeting agenda
4. post-go-live hypercare tracker
5. production rollback decision sheet

## 18. Final Release Rule

No Watchman Finance release group should go live until:
- UAT is completed
- required owners have signed off
- go-live checklist is complete
- rollback readiness is confirmed
- production cutover responsibility is assigned
