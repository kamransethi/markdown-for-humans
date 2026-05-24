# Credit Policy Overview

#credit-policy #status/approved #priority/high #compliance/ecoa #compliance/reg-b

The credit policy defines the rules by which the [[workflow/adjudication-engine|adjudication engine]] evaluates auto loan applications. Every rule is codified — no discretionary overrides are permitted in automated decisioning.

## Policy Components

The credit policy comprises four interrelated rule sets:

### 1. Risk Tier Assignment
The [[credit-policy/tier-matrix]] maps an applicant's FICO score (sourced from [[equifax/equifax-integration|Equifax]]) to one of five risk tiers. The tier determines:
- Available loan terms
- Interest rate bands (see [[data/rate-sheet-2024-q4.csv]])
- Maximum LTV and DTI ratios

### 2. Debt-to-Income Rules
The [[credit-policy/dti-rules]] define the maximum allowable DTI ratio per tier. DTI is calculated as:
```
DTI = (existing_monthly_debt + proposed_payment) / gross_monthly_income × 100
```

### 3. Loan-to-Value Guidelines
The [[credit-policy/ltv-guidelines]] cap the loan amount relative to vehicle value per tier. LTV is calculated as:
```
LTV = loan_amount / vehicle_value × 100
```

### 4. Vehicle Eligibility
- **Maximum age:** Current year minus vehicle year ≤ 10
- **Maximum mileage:** 120,000 miles
- **Salvage/rebuilt title:** Not eligible
- See [[dealership/dealer-submission-format#vehicle-data]] for required vehicle fields

## Policy Versioning

Credit policies are versioned quarterly. The current effective policy is **Q4-2024**, effective 2024-10-01. Rate data is maintained in [[data/rate-sheet-2024-q4.csv]].

| Version | Effective | Key Changes |
|---------|-----------|-------------|
| Q4-2024 | 2024-10-01 | Expanded 84-month terms to Near Prime |
| Q3-2024 | 2024-07-01 | Raised Deep Subprime minimum score to 500 |
| Q2-2024 | 2024-04-01 | Added [[equifax/soft-pull-vs-hard-pull\|soft pull]] pre-qualification |

## Compliance

All policy rules must comply with:
- **Regulation B (ECOA):** No prohibited-basis factors in decisioning. See [[compliance/reg-b-checklist]] *(not yet documented)*.
- **TILA:** All rate and fee disclosures in [[decisions/document-generation|closing documents]].
- **FCRA:** Bureau data usage governed by [[equifax/equifax-integration#permissible-purpose|permissible purpose]] rules.

## Decision Outcomes

The policy produces one of three outcomes per [[workflow/loan-orchestration|orchestration flow]]:

1. **[[decisions/approval-workflow|Approval]]** — All rules pass
2. **[[decisions/counter-offer|Counter-Offer]]** — Marginal failure, adjustable
3. **[[decisions/decline-reasons|Decline]]** — Hard failure, [[decisions/decline-reasons#adverse-action-notices|adverse action notice]] required

## Embedded: Current Rate Sheet

![[data/rate-sheet-2024-q4.csv]]

## Related

- [[credit-policy/tier-matrix]]
- [[credit-policy/dti-rules]]
- [[credit-policy/ltv-guidelines]]
- [[workflow/adjudication-engine]]
- [[equifax/credit-score-mapping]]
- [[dealership/dealer-scorecard]] *(broken — concept not yet documented)*

---

#auto-lending #risk/tier-1 #risk/tier-2 #risk/tier-3
