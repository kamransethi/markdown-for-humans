# Stipulation Checklist

#workflow/fulfillment #status/draft #priority/medium

After a deal is [[decisions/approval-workflow|approved]] or a [[decisions/counter-offer|counter-offer]] is accepted, the applicant must satisfy stipulations before funding.

## Standard Stipulations

| # | Stipulation | Required For | Deadline |
|---|------------|-------------|----------|
| 1 | Proof of income (2 recent paystubs) | All tiers | 10 business days |
| 2 | Proof of residence (utility bill, lease) | All tiers | 10 business days |
| 3 | Valid driver's license | All tiers | 10 business days |
| 4 | Proof of insurance (full coverage, lender named) | All tiers | Before funding |
| 5 | Additional down payment receipt | [[decisions/counter-offer]] only | Before funding |
| 6 | Co-signer application & bureau pull | [[credit-policy/tier-matrix#deep-subprime|Deep Subprime]] only | 10 business days |

## Conditional Stipulations

These are triggered by specific [[workflow/adjudication-engine|adjudication]] findings:

- **High LTV (> 100%):** Require GAP insurance proof. See [[credit-policy/ltv-guidelines#gap-insurance]].
- **Self-employed applicant:** Require 2 years tax returns instead of paystubs.
- **Fraud alert on bureau:** Require in-person ID verification. See [[equifax/equifax-integration#fraud-alerts]].

## Upload Process

Dealers upload stipulation documents via the [[architecture/api-gateway|API Gateway]] `POST /v2/applications/{id}/stipulations` endpoint. Documents are stored in S3 and linked to the application record.

## Expiration

Documents expire after 90 days. If a stipulation is not satisfied within the deadline, the approval is rescinded and the deal status moves to `EXPIRED`. The dealer is notified via the [[dealership/dealer-network#notifications|dealer notification system]].

## Tracking

The stipulation status for each deal can be viewed alongside the transaction data in [[data/sample-transactions.csv]]. The `status` column reflects whether stips are complete.

## Related

- [[decisions/approval-workflow]] — triggers stip requirements
- [[decisions/counter-offer]] — may add additional stips
- [[decisions/document-generation]] — produces the stip checklist document for the borrower
- [[decisions/appeal-process]] — *(not yet implemented, broken link)*

---

#compliance/tila #compliance/reg-b
