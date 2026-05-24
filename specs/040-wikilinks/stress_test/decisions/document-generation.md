# Document Generation Service

#workflow/fulfillment #integration/document-service #status/approved #priority/medium

The document generation service produces the closing package for every [[decisions/approval-workflow|approved]] deal and [[decisions/decline-reasons#adverse-action-notices|adverse action notices]] for every [[decisions/decline-reasons|declined]] deal.

## Document Types

### Approval Package
Generated after [[decisions/approval-workflow|approval]] and [[workflow/stipulation-checklist|stipulation]] completion:

| Document | Required By | Template ID |
|----------|------------|-------------|
| Retail Installment Sales Contract (RISC) | State law | `TPL-001` |
| Truth in Lending Disclosure (TILA) | [[compliance/reg-b-checklist\|Reg Z / TILA]] | `TPL-002` |
| Privacy Notice | GLBA | `TPL-003` |
| GAP Insurance Agreement | [[credit-policy/ltv-guidelines#gap-insurance\|LTV > 100%]] | `TPL-004` |
| Payment Schedule | Internal | `TPL-005` |
| E-Sign Consent | ESIGN Act | `TPL-006` |

### Decline Package
Generated immediately upon [[decisions/decline-reasons|decline]]:

| Document | Required By | Template ID |
|----------|------------|-------------|
| Adverse Action Notice | ECOA / FCRA | `TPL-010` |
| Credit Score Disclosure | FCRA | `TPL-011` |
| Consumer Rights Notice | FCRA | `TPL-012` |

### Counter-Offer Package
Generated when a [[decisions/counter-offer|counter-offer]] is issued:

| Document | Required By | Template ID |
|----------|------------|-------------|
| Counter-Offer Summary | Internal | `TPL-020` |
| Revised TILA Disclosure | Reg Z | `TPL-021` |
| Revised Payment Schedule | Internal | `TPL-022` |

## Data Sources

Documents are populated with data from multiple sources:

| Data | Source | Wikilink |
|------|--------|----------|
| Applicant info | Deal submission | [[dealership/dealer-submission-format]] |
| Credit score | Bureau response | [[equifax/credit-score-mapping]] |
| Rate & term | Rate sheet | [[data/rate-sheet-2024-q4.csv]] |
| Adverse action reasons | Adjudication | [[decisions/decline-reasons]] |
| Dealer info | Dealer registry | [[data/dealer-codes.txt]] |
| Error context | Error catalog | [[data/error-codes.txt]] |

## Generation Pipeline

1. Decision event consumed from [[architecture/message-queue|Kafka]] topic `loan.documents.generate`
2. Template selected based on decision type and state jurisdiction
3. Data merged from application record, decision record, and reference data
4. PDF rendered and stored in document vault (S3)
5. Document ID linked to application record
6. Notification sent to [[dealership/dealer-network|dealer]] via webhook

## Compliance Requirements

All generated documents must comply with:
- **TILA / Reg Z:** APR, finance charge, total of payments, payment schedule
- **ECOA / Reg B:** No prohibited-basis language in adverse action
- **FCRA:** Credit score disclosure, consumer rights
- **State-specific:** Variations for CA, TX, NY, FL (different disclosure requirements)

See [[compliance/reg-b-checklist]] for the full compliance matrix *(not yet documented — broken link)*.

## Retention

All generated documents are retained for **7 years** per regulatory requirements. Documents are immutable — if a correction is needed, a new version is generated with a supersede reference to the original.

## Related

- [[decisions/approval-workflow]]
- [[decisions/counter-offer]]
- [[decisions/decline-reasons]]
- [[workflow/stipulation-checklist]]
- [[workflow/loan-orchestration]]
- [[architecture/api-gateway]]
- [[data/sample-transactions.csv]]

---

#auto-lending #compliance/tila #compliance/ecoa #compliance/fcra
