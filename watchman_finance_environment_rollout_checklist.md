# Watchman Finance Environment Rollout Checklist
## Development, Staging, UAT, and Production

## 1. Purpose

This document defines the environment rollout checklist for Watchman Finance across the standard implementation environments.

It is intended to support:
- controlled promotion between environments
- schema and application deployment discipline
- release validation by environment
- ownership and signoff control
- deployment readiness review
- rollback awareness at each stage

## 2. Standard Environment Sequence

Watchman Finance should move through environments in this order:

1. local development
2. shared development
3. staging
4. UAT
5. production

No release group should skip an environment unless an explicitly approved exception is documented.

## 3. Rollout Principles

### 3.1 Promote in sequence
Do not promote to the next environment until the current environment passes validation.

### 3.2 Keep schema and app release coordinated
Where practical, deploy schema first, then dependent services and UI.

### 3.3 Validate permissions and audit in every environment
RLS, entity scoping, permissions, and audit logs must be checked at each stage.

### 3.4 Use the release group model
All rollout activity should be tied to Release Groups A through E.

### 3.5 Treat production as a controlled business event
Production rollout requires full checklist completion, signoff, and rollback readiness.

## 4. Standard Owner Roles

Use these owner categories in each environment:

- Product Owner
- Technical Owner
- Finance Owner
- QA and Release Owner
- Compliance Owner where applicable
- HR and Workforce Owner where payroll or leave is involved
- Operations Owner where operational integration or inventory is involved
- Executive Sponsor for production approval where required

## 5. Global Checklist for Every Environment

Confirm the following in every environment:

- correct release group identified
- migration order confirmed
- deployment package confirmed
- environment variables confirmed
- secrets confirmed
- seed data confirmed
- permissions validated
- audit logging validated
- smoke tests identified
- issue owner assigned
- rollback awareness documented

## 6. Local Development Checklist

### Objective
Allow safe developer implementation and early functional validation.

### Required checks
- migration files run locally in correct order
- local seed data loads successfully
- tables, views, indexes, and triggers compile
- basic route structure runs locally
- core server actions execute without schema errors
- sample test users and roles are available
- RLS behavior is testable
- audit helper writes successfully
- no blocking migration defects remain unresolved

### Exit criteria
- developer confirms pack or release-group work is runnable locally
- no unresolved schema blockers remain
- code is ready for shared development deployment

## 7. Shared Development Checklist

### Objective
Validate that the release group works in a shared team environment with realistic setup data and coordinated testing.

### Required checks
- migrations applied successfully
- shared dev seed data loaded
- role and permission mappings present
- integration test payloads available
- routes load correctly
- server actions execute correctly
- module-specific smoke tests pass
- issue logging process active
- finance and product owners can review functionality

### Exit criteria
- release group is stable enough for structured staging validation
- major defects are fixed or formally tracked
- no unresolved critical permission or audit issues remain

## 8. Staging Checklist

### Objective
Validate the release group in a production-like environment before formal business acceptance testing.

### Required checks
- migrations applied in correct order
- production-like configs verified
- required secrets and connectors verified
- RLS validated
- audit logging validated
- integration ingest and promotion paths validated
- module workflows validated end to end
- reporting views compile and return expected scoped data
- operational alerts and logs reviewed
- release notes drafted

### Release-group-specific checks
Use the applicable module workflows for the release group:
- Release Group A: tenancy, scope, audit, staging
- Release Group B: AR, AP, payroll, leave, banking
- Release Group C: billing, pricing, inventory, assets
- Release Group D: reporting, dashboards, planning
- Release Group E: consolidation, feature flags, release controls, recovery tools

### Exit criteria
- staging validation passed
- no unresolved critical defects remain
- release group approved for UAT

## 9. UAT Checklist

### Objective
Allow business owners and designated testers to validate that the release group is acceptable for real-world use.

### Required checks
- UAT environment stable
- UAT test accounts provisioned
- UAT packet issued
- test scenarios assigned
- pass and fail criteria communicated
- issue log active
- signoff owners identified
- critical workflows tested successfully
- negative-path tests executed
- permissions validated from user perspective
- audit behavior confirmed for material workflows

### Exit criteria
- required UAT scenarios passed
- critical and uncontrolled high defects resolved or formally deferred
- signoffs collected
- release approved or approved with conditions for production

## 10. Production Checklist

### Objective
Deploy the release group into live operation with control, monitoring, and rollback readiness.

### Pre-deployment checks
- production release window approved
- backup completed
- restore point confirmed
- migration package verified
- deployment owner assigned
- rollback owner assigned
- release notes finalized
- signoffs collected
- hypercare owner assigned
- monitoring and alerting reviewed

### Deployment checks
- migrations applied successfully
- dependent application code deployed successfully
- seed and registry state validated
- feature flags confirmed
- critical routes accessible
- key server actions reachable

### Immediate post-deployment checks
- smoke tests passed
- permissions validated
- audit logs writing
- integration health normal
- no critical alerts open
- production status communicated

### Exit criteria
- release group is live
- go-live confirmation sent
- hypercare begins
- support and issue triage active

## 11. Release Group Environment Focus

## Release Group A
### Environment focus
- tenant isolation
- entity scoping
- permissions
- audit logs
- sync staging
- integration error handling

## Release Group B
### Environment focus
- invoice and bill workflows
- payroll calculation
- payroll approval and finalize
- leave requests and accruals
- bank import and reconciliation

## Release Group C
### Environment focus
- catalog configuration
- billing candidate conversion
- price and rule handling
- stock receipt and transfer
- asset assignment and return

## Release Group D
### Environment focus
- report snapshots
- dashboard outputs
- KPI visibility
- close task usability
- budget and forecast workflow
- variance outputs

## Release Group E
### Environment focus
- consolidation setup
- intercompany structures
- feature flags
- tenant activation readiness
- release controls
- recovery and restore readiness

## 12. Environment Promotion Decision Template

Use the following fields for every promotion decision:

**Release Group**  
**Current Environment**  
**Target Environment**  
**Promotion Date**  
**Promotion Owner**  
**Summary of Validation Completed**  
**Outstanding Issues**  
**Critical Risks**  
**Promotion Decision: Approve / Approve with Conditions / Do Not Approve**

## 13. Minimum Signoff by Environment

### Shared development to staging
- Technical Owner
- Product Owner
- QA and Release Owner

### Staging to UAT
- Technical Owner
- Product Owner
- Finance Owner where applicable
- QA and Release Owner

### UAT to production
- Product Owner
- Technical Owner
- Finance Owner where applicable
- Compliance Owner where applicable
- QA and Release Owner
- Executive Sponsor where required

## 14. Rollout Failure Triggers

Pause promotion if any of the following occur:

- migration failure
- unresolved critical workflow defect
- tenant or entity scope failure
- audit logging failure
- unresolved security issue
- materially incorrect reporting output
- uncontrolled payroll or reconciliation failure
- missing required signoff

## 15. Environment Evidence to Retain

Keep the following records for each promotion step:

- migration run record
- seed validation record
- smoke test results
- issue log
- approval record
- deployment notes
- rollback awareness note
- post-promotion validation summary

## 16. Immediate Companion Uses

This checklist should now be used to produce:
1. environment-specific rollout sheets
2. release-group promotion records
3. staging validation forms
4. UAT entry and exit checklists
5. production cutover packets

## 17. Final Rollout Rule

No Watchman Finance release group should be promoted to the next environment until:
- required validation is complete
- required owners approve promotion
- critical issues are resolved or formally dispositioned
- rollback awareness is documented
