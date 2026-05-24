# Approval Workflow

#workflow/decision #status/approved #priority/high

When the [[workflow/adjudication-engine|adjudication engine]] determines that an application passes all [[credit-policy/credit-policy-overview|credit policy]] rules, the deal enters the approval workflow.

## Approval Criteria

All of the following must be true:

| Rule | Check | Source |
|------|-------|--------|
| Credit tier assigned | Score ≥ 500, valid tier | [[credit-policy/tier-matrix]] |
| DTI within limit | DTI ≤ tier max | [[credit-policy/dti-rules]] |
| LTV within limit | LTV ≤ tier max | [[credit-policy/ltv-guidelines]] |
| Term available | Requested term valid for tier | [[data/rate-sheet-2024-q4.csv]] |
| Dealer active | Dealer status = ACTIVE | [[data/dealer-codes.txt]] |
| No fraud alerts | Bureau clean | [[equifax/equifax-integration]] |

## Approval Steps

### Step 1: Rate Lock
The approved rate is locked from [[data/rate-sheet-2024-q4.csv]] for the applicant's tier and term. Rate locks expire after **30 calendar days**.

### Step 2: Stipulation Assignment
The [[workflow/stipulation-checklist]] is generated based on the deal characteristics:
- Standard stips for all approvals
- Conditional stips based on LTV, employment type, fraud alerts

### Step 3: Document Generation
The [[decisions/document-generation|document generation service]] creates the closing package:
- Retail Installment Sales Contract (RISC)
- Truth in Lending (TILA) disclosure
- Privacy notice
- GAP insurance agreement (if applicable per [[credit-policy/ltv-guidelines#gap-insurance]])

### Step 4: Dealer Notification
The approval decision is pushed to the [[dealership/dealer-network|dealer]] via:
- Webhook callback (real-time)
- API polling (`GET /v2/applications/{id}/decision` per [[architecture/api-gateway]])
- Flat-file results (for [[dealership/flat-file-import|legacy dealers]])

### Step 5: Funding Queue
Once all stipulations are satisfied, the deal enters the funding queue. Funding is typically processed within 24–48 business hours.

## Approval Rate by Tier

Based on [[data/sample-transactions.csv|recent data]]:

| Tier | Approval Rate |
|------|---------------|
| Super Prime | ~95% |
| Prime | ~88% |
| Near Prime | ~72% |
| Subprime | ~45% |
| Deep Subprime | ~15% |

## Conditional Approvals

Some approvals are **conditional** — the deal is approved subject to stipulation completion. If stipulations are not met within the deadline (per [[workflow/stipulation-checklist]]), the approval is rescinded.

## Related

- [[decisions/counter-offer]] — alternative when approval criteria are not fully met
- [[decisions/decline-reasons]] — when the deal cannot be approved
- [[decisions/document-generation]] — closing package creation
- [[workflow/loan-orchestration]] — parent orchestration flow
- [[decisions/appeal-process]] *(not yet implemented — broken link)*

---

#auto-lending #workflow/fulfillment #compliance/tila
