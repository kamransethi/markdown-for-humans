# Soft Pull vs. Hard Pull Policy

#integration/equifax #credit-policy #compliance/fcra #status/approved #priority/medium

The platform supports two types of credit bureau pulls through the [[equifax/equifax-integration|Equifax integration]]. The pull type determines whether the inquiry appears on the consumer's credit report.

## Soft Pull

A soft pull (also called a "soft inquiry" or "pre-qualification check") does **not** appear as an inquiry on the consumer's credit report.

**Use cases:**
- Dealer pre-screen before full application
- Rate estimation for consumer shopping
- Portfolio monitoring of existing borrowers

**Data returned:**
- FICO score (see [[equifax/credit-score-mapping]])
- Summary risk indicators
- Fraud/freeze status

**Not returned (soft pull only):**
- Full trade line detail (needed for [[credit-policy/dti-rules|DTI calculation]])
- Complete public records
- Detailed inquiry history

**Limitation:** A soft pull provides enough data for a preliminary [[credit-policy/tier-matrix|tier assignment]] but is **insufficient** for full [[workflow/adjudication-engine|adjudication]]. A hard pull is always required before a binding decision can be issued.

## Hard Pull

A hard pull (or "hard inquiry") is recorded on the consumer's credit report and may temporarily lower their score by 5–10 points.

**Use cases:**
- Full auto loan application submitted via [[architecture/api-gateway|API]]
- Consumer has consented to a credit check at the [[dealership/dealer-network|dealership]]

**Data returned:**
- Everything from soft pull, plus:
- Full trade line detail (used for [[credit-policy/dti-rules|DTI]])
- Complete public records (bankruptcies, judgments, liens)
- Inquiry history (counts of recent hard pulls)
- Collection accounts

**Regulatory requirement:** The dealer must obtain written or electronic consent before requesting a hard pull. Consent evidence is logged for [[compliance/reg-b-checklist|Reg B compliance]] *(not yet documented — broken link)*.

## Decision Tree

```
Consumer at dealership
        │
        ▼
  Dealer wants pre-screen?
   ┌──YES──┐   ┌──NO──┐
   │       │   │      │
   ▼       │   │      ▼
Soft Pull  │   │  Full Application
   │       │   │      │
   ▼       │   │      ▼
Show rate  │   │  Hard Pull
estimate   │   │      │
   │       │   │      ▼
   ▼       │   │  [[workflow/adjudication-engine|Adjudication]]
Consumer   │   │      │
interested?│   │      ▼
   │       │   │  Decision
  YES──────┘   └──────┘
   │
   ▼
Full Application → Hard Pull → Adjudication → Decision
```

## Rate Shopping Window

Under FCRA guidelines, multiple hard pulls for auto loan applications within a **14-day window** are treated as a single inquiry for scoring purposes. This allows consumers to shop rates across dealers without penalty.

The [[workflow/transaction-intake|intake service]] tracks the timestamp of the first hard pull per applicant (by SSN) to inform dealers when the shopping window expires.

## Embedded: Error Codes for Bureau Issues

The following errors relate specifically to bureau pulls:

![[data/error-codes.txt]]

## Related

- [[equifax/equifax-integration]]
- [[equifax/credit-score-mapping]]
- [[credit-policy/credit-policy-overview]]
- [[workflow/adjudication-engine]]
- [[workflow/transaction-intake]]

---

#auto-lending #compliance/fcra #compliance/ecoa
