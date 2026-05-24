# Decline Reasons & Adverse Action

#workflow/decision #compliance/ecoa #compliance/reg-b #compliance/fcra #status/approved #priority/high

When the [[workflow/adjudication-engine|adjudication engine]] cannot approve a deal — and no [[decisions/counter-offer|counter-offer]] is viable — the application is declined with specific reason codes.

## Decline Decision Criteria

A decline is issued when any of these conditions are met and cannot be remediated:

| Condition | Error Code | Description |
|-----------|-----------|-------------|
| Score below minimum | `ERR-3005` | FICO < 500 per [[credit-policy/tier-matrix]] |
| DTI far over limit | `ERR-3001` | DTI exceeds [[credit-policy/dti-rules\|tier max]] by > 5 points |
| LTV far over limit | `ERR-3002` | LTV exceeds [[credit-policy/ltv-guidelines\|tier max]] by > 15 points |
| Term unavailable | `ERR-3003` | No acceptable term exists for tier (per [[data/rate-sheet-2024-q4.csv]]) |
| Vehicle ineligible | `ERR-3004` | Vehicle age or mileage exceeds policy |
| Bureau issue | `ERR-2002`, `ERR-2003` | No credit file or file frozen (see [[equifax/equifax-integration]]) |
| Dealer blocked | `ERR-4001` | Dealer SUSPENDED/INACTIVE (see [[data/dealer-codes.txt]]) |

Full error code catalog: [[data/error-codes.txt]]

## Minimum Credit Score

Applications with a FICO score below **500** are automatically declined without further analysis. The [[equifax/credit-score-mapping|score mapping]] determines the exact cutoff. No [[decisions/counter-offer|counter-offer]] is attempted.

## Adverse Action Notices

Under **Regulation B (Equal Credit Opportunity Act)** and **FCRA**, every declined applicant must receive an adverse action notice within **30 days** of the decision.

The notice must include:
1. **The specific reasons for denial** (up to 4 reasons, in order of significance)
2. **Credit score used** and the score range
3. **Key factors** that adversely affected the score
4. **Bureau identity** — Equifax (see [[equifax/equifax-integration]])
5. **Consumer's right** to request a free credit report within 60 days
6. **Contact information** for disputes

### Sample Adverse Action Reasons

| Priority | Reason Text |
|----------|-------------|
| 1 | Debt-to-income ratio exceeds maximum threshold |
| 2 | Loan-to-value ratio exceeds maximum for risk category |
| 3 | Insufficient credit history (fewer than 3 active trade lines) |
| 4 | Excessive recent credit inquiries (> 6 in past 12 months) |

## Document Generation

The adverse action letter is produced by the [[decisions/document-generation|document generation service]] using a template that includes all required ECOA/FCRA disclosures.

## Decline Rate by Reason

Based on [[data/sample-transactions.csv|recent transaction data]]:

| Reason | % of All Declines |
|--------|------------------|
| DTI exceeds limit | 35% |
| LTV exceeds limit | 25% |
| Credit score below minimum | 20% |
| Multiple factors combined | 12% |
| Bureau issues | 5% |
| Vehicle ineligibility | 3% |

## Worked Examples from Sample Data

### Deal TXN-20241001-004 (Declined)
- **Applicant:** Linh Nguyen
- **Score:** 611 → [[credit-policy/tier-matrix#subprime\|Subprime]]
- **DTI:** 47.2% — exceeds 38% max by **9.2 points** (> 5 point tolerance → decline)
- **LTV:** 118.6% — exceeds 95% max by **23.6 points** (> 15 point tolerance → decline)
- **Adverse action reasons:** DTI too high, LTV too high

### Deal TXN-20241002-006 (Declined)
- **Applicant:** Janice Williams
- **Score:** 583 → [[credit-policy/tier-matrix#deep-subprime\|Deep Subprime]]
- **DTI:** 52.4% — exceeds 35% max by **17.4 points**
- **LTV:** 110.2% — exceeds 85% max by **25.2 points**
- **Adverse action reasons:** DTI too high, LTV too high, credit score in Deep Subprime range

## Appeal Process

> ⚠️ An [[decisions/appeal-process]] allowing applicants to dispute or provide additional documentation is planned for Phase 2 but has not been implemented. This link is intentionally broken.

## Related

- [[decisions/approval-workflow]]
- [[decisions/counter-offer]]
- [[decisions/document-generation]]
- [[workflow/adjudication-engine]]
- [[credit-policy/credit-policy-overview]]
- [[equifax/equifax-integration]]
- [[data/error-codes.txt]]

---

#auto-lending #compliance/ecoa #compliance/reg-b #compliance/fcra
