# Watchman Finance Hypercare and Post-Go-Live Support Tracker
## Release Groups A Through E

## 1. Purpose

This document defines the hypercare and post-go-live support structure for Watchman Finance after each release group moves into production.

It is intended to support:
- controlled post-launch stabilization
- issue triage and escalation
- finance workflow monitoring
- user-support coordination
- executive visibility during early production use
- formal transition from launch support into steady-state operations

## 2. Hypercare Definition

Hypercare is the controlled support period immediately following production go-live during which the implementation team, finance owners, and support owners actively monitor the release, review issues, and validate that the released module is stable in real-world use.

Hypercare should be treated as a planned operational phase, not an informal observation period.

## 3. Hypercare Objectives

The objectives of hypercare are to:

- detect early production defects quickly
- validate critical workflows under real use
- confirm permissions and audit behavior remain correct
- identify training gaps and user confusion
- prevent small defects from becoming financial-control failures
- provide leadership with clear stabilization status
- decide when the release can move to normal support operations

## 4. Hypercare Duration

Recommended hypercare minimums:

### Release Group A
5 to 10 business days

### Release Group B
10 to 15 business days

### Release Group C
10 business days

### Release Group D
5 to 10 business days

### Release Group E
10 to 15 business days

These durations may be extended based on:
- issue volume
- severity of defects
- payroll timing
- reconciliation timing
- customer billing timing
- executive direction

## 5. Hypercare Owner Roles

The following owner roles should be assigned for every hypercare period:

- Executive Sponsor
- Product Owner
- Technical Owner
- Finance Owner
- QA and Release Owner
- Compliance Owner where control-sensitive workflows are involved
- HR and Workforce Owner for payroll and leave releases
- Operations Owner for billing, inventory, asset, and integration-sensitive releases
- Support Coordinator or designated implementation manager

## 6. Hypercare Control Structure

Each hypercare period should include:

1. named support owner
2. daily issue review cadence
3. severity classification model
4. escalation path
5. rollback threshold awareness
6. executive reporting cadence
7. closure criteria

## 7. Standard Hypercare Tracker Fields

Use the following fields for every hypercare tracker:

**Release Group**  
**Release Code**  
**Go-Live Date**  
**Hypercare Start Date**  
**Hypercare End Date**  
**Primary Support Owner**  
**Technical Owner**  
**Finance Owner**  
**QA and Release Owner**  
**Executive Sponsor**  
**Overall Status: Green / Yellow / Red**

## 8. Issue Log Fields

Track every post-go-live issue using the following fields:

**Issue ID**  
**Date Reported**  
**Reported By**  
**Module**  
**Release Group**  
**Issue Summary**  
**Severity: Critical / High / Medium / Low**  
**Workflow Impacted**  
**Tenant Impacted**  
**Entity Impacted**  
**User Group Impacted**  
**Financial Integrity Risk: Yes / No**  
**Security or Permission Risk: Yes / No**  
**Audit Risk: Yes / No**  
**Current Status**  
**Assigned Owner**  
**Target Resolution Date**  
**Actual Resolution Date**  
**Workaround Available: Yes / No**  
**Workaround Description**  
**Rollback Consideration Required: Yes / No**  
**Notes**

## 9. Severity Model

### Critical
Immediate executive, finance, and technical escalation required.

Examples:
- payroll corruption
- unauthorized data exposure
- reconciliation corruption
- audit failure on material workflows
- blocking financial-control failure

### High
Urgent same-day or next-day action required.

Examples:
- major invoice or bill workflow failure
- payroll calculation defect with contained scope
- inventory or asset accountability breakdown
- feature failure without broad data corruption

### Medium
Requires planned correction but does not immediately threaten financial control.

Examples:
- reporting defect with workaround
- role-specific workflow friction
- approval-routing defect with manual workaround

### Low
Non-blocking defect or usability issue.

Examples:
- formatting issue
- minor UI inconsistency
- low-impact workflow friction

## 10. Daily Hypercare Review Template

Every business day during hypercare, review the following:

### 10.1 Operational status
- overall release health
- open issue count
- critical issue count
- high issue count
- unresolved permission issues
- unresolved audit issues

### 10.2 Workflow status
- key workflows tested in production
- failed workflows
- degraded workflows
- workaround-dependent workflows

### 10.3 User support status
- support requests received
- training questions identified
- documentation gaps identified
- owner response times

### 10.4 Decision status
- issues requiring leadership review
- issues requiring rollback analysis
- issues approved for forward fix
- issues deferred to normal support

## 11. Release Group Hypercare Focus Areas

## Release Group A
### Focus
- tenant and entity resolution
- roles and permissions
- RLS behavior
- audit logs
- Launch and Operations staging behavior
- sync and promotion exceptions

### Watch closely
- unauthorized access
- missing audit entries
- failed promotions
- bad source mapping

## Release Group B
### Focus
- invoice and bill workflow stability
- payroll run accuracy
- leave approval and accrual behavior
- bank import and reconciliation behavior
- payment recording behavior

### Watch closely
- payroll errors
- reconciliation mismatches
- AR/AP state-transition failures
- leave balance misstatements

## Release Group C
### Focus
- catalog configuration
- billing-candidate generation
- invoice conversion from candidates
- stock movement accuracy
- asset issue and return accountability

### Watch closely
- incorrect pricing
- missing billing candidates
- stock balance errors
- assignment and return control failures

## Release Group D
### Focus
- report snapshot reliability
- dashboard accuracy
- budget and forecast workflow stability
- variance generation
- close checklist usability

### Watch closely
- materially misleading outputs
- failed report generation
- planning workflow breakdown
- executive-dashboard trust issues

## Release Group E
### Focus
- consolidation setup and output reliability
- intercompany workflow stability
- feature-flag behavior
- release-governance tooling
- alerting and recovery readiness

### Watch closely
- wrong feature enablement
- release-control gaps
- misleading readiness outputs
- recovery tool failures

## 12. Hypercare Escalation Path

Use this escalation structure:

### Level 1
Support Owner and Technical Owner

### Level 2
Finance Owner, Product Owner, QA and Release Owner

### Level 3
Compliance Owner, HR Owner, Operations Owner as applicable

### Level 4
Executive Sponsor

Escalate immediately to Level 4 for:
- critical payroll issue
- security or tenant-isolation issue
- audit-control failure
- major financial integrity concern
- rollback recommendation

## 13. Hypercare Status Definitions

### Green
- no critical issues
- high issues controlled
- workflows stable
- user support volume manageable
- no rollback discussion active

### Yellow
- one or more high issues active
- workarounds in use
- targeted workflows need close monitoring
- stabilization still in progress

### Red
- critical issue active
- rollback or restore under consideration
- financial, security, or audit risk present
- executive review required

## 14. Hypercare Meeting Cadence

Recommended cadence:

### Daily
- support review
- issue triage
- owner assignment check
- workflow health review

### Twice Weekly
- business-owner review
- finance-owner review
- status update to leadership

### End of Hypercare
- closure review
- lessons learned
- transition to normal support decision

## 15. Post-Go-Live Checklist

Immediately after go-live and throughout hypercare, confirm:

- production routes are accessible
- permissions behave correctly
- audit logs are recording
- critical workflows run successfully
- open alerts are reviewed
- support intake is monitored
- issue owners are assigned
- release notes are accessible to support staff
- rollback threshold remains understood

## 16. Hypercare Summary Dashboard Fields

The hypercare summary should report:

- total open issues
- total critical issues
- total high issues
- total resolved issues
- unresolved permission issues
- unresolved audit issues
- unresolved workflow blockers
- user groups impacted
- modules affected
- current status color
- leadership attention required: Yes / No

## 17. Transition to Steady-State Support

A release group should only move from hypercare to normal support when:

- no critical issues remain open
- no uncontrolled high issues remain open
- key workflows are stable
- finance owner agrees the release is usable
- support owner agrees issue volume is manageable
- technical owner agrees the release is stable
- executive sponsor is informed of closure

## 18. Hypercare Closure Record

At the end of hypercare, document:

**Release Group**  
**Go-Live Date**  
**Hypercare End Date**  
**Total Issues Logged**  
**Critical Issues Logged**  
**High Issues Logged**  
**Outstanding Issues Deferred**  
**Major Lessons Learned**  
**Stability Assessment**  
**Approved for Steady-State Support: Yes / No**

### Closure signoff
- Product Owner
- Technical Owner
- Finance Owner
- QA and Release Owner
- Executive Sponsor informed

## 19. Immediate Companion Uses

This tracker should now be used to produce:

1. a live issue register by release group
2. a daily hypercare status sheet
3. an executive stabilization update format
4. a closure memo template
5. a steady-state support handoff record

## 20. Final Hypercare Rule

No Watchman Finance release should be treated as fully stabilized until:
- hypercare has been formally run
- issues have been triaged and tracked
- required owners have reviewed status
- closure criteria have been met
