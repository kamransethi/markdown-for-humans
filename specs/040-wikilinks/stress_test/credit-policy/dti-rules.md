# Debt-to-Income (DTI) Rules

#credit-policy #status/approved #priority/high #compliance/reg-b

DTI is a primary gating rule in the [[workflow/adjudication-engine|adjudication engine]]. It measures the applicant's ability to service the proposed auto loan payment alongside existing obligations.

## Calculation

```
DTI = (total_monthly_debt_obligations + proposed_monthly_payment) / gross_monthly_income × 100
```

Where:
- **`total_monthly_debt_obligations`** includes all trade lines reported by [[equifax/equifax-integration|Equifax]]: mortgages, auto loans, credit cards (minimum payment), student loans, personal loans
- **`proposed_monthly_payment`** is calculated from the loan amount, rate (from [[data/rate-sheet-2024-q4.csv]]), and term
- **`gross_monthly_income`** is stated income from the application (verified via [[workflow/stipulation-checklist|stipulations]] post-approval)

## Maximum DTI by Tier

| Tier | Max DTI | Reference |
|------|---------|-----------|
| [[credit-policy/tier-matrix#super-prime\|Super Prime]] | 45% | Q4-2024 policy |
| [[credit-policy/tier-matrix#prime\|Prime]] | 45% | Q4-2024 policy |
| [[credit-policy/tier-matrix#near-prime\|Near Prime]] | 42% | Q4-2024 policy |
| [[credit-policy/tier-matrix#subprime\|Subprime]] | 38% | Q4-2024 policy |
| [[credit-policy/tier-matrix#deep-subprime\|Deep Subprime]] | 35% | Q4-2024 policy |

## Super Prime

Super Prime applicants (FICO 780+) are allowed up to **45% DTI**. At this tier, higher DTI is considered acceptable because the applicant has demonstrated strong credit management over time.

## Prime

Prime applicants (FICO 720–779) share the same **45% DTI** ceiling as Super Prime.

## Near Prime

Near Prime applicants (FICO 660–719) are capped at **42% DTI**. This slightly lower ceiling reflects higher statistical default rates at this score band.

## Subprime

Subprime applicants (FICO 600–659) are limited to **38% DTI**. Combined with LTV restrictions from [[credit-policy/ltv-guidelines#subprime]], this creates a conservative underwriting box.

## Deep Subprime

Deep Subprime applicants (FICO 500–599) are restricted to **35% DTI** — the tightest limit. Most applications at this tier with DTI above 30% receive a [[decisions/counter-offer]] suggesting a shorter term or co-signer.

## Counter-Offer Logic

When DTI exceeds the tier maximum by ≤ 5 percentage points, the [[workflow/adjudication-engine]] evaluates whether adjusting the loan terms could bring DTI into compliance:

1. **Extend term** (if a longer term is available for the tier) → reduces monthly payment
2. **Reduce loan amount** → requires additional down payment
3. **Add co-signer income** → available for Deep Subprime only

If DTI exceeds the max by > 5 points, or no counter-offer can resolve it, the application is [[decisions/decline-reasons|declined]] with reason `DTI_EXCEEDS_LIMIT` (see [[data/error-codes.txt]], code `ERR-3001`).

## Worked Example

Deal `TXN-20241002-006` from [[data/sample-transactions.csv]]:
- Credit score: 583 → [[credit-policy/tier-matrix#deep-subprime|Deep Subprime]]
- DTI: 52.4% → exceeds 35% max by **17.4 points**
- Result: **Declined** (too far above max for counter-offer)

## Related

- [[credit-policy/credit-policy-overview]]
- [[credit-policy/tier-matrix]]
- [[credit-policy/ltv-guidelines]]
- [[workflow/adjudication-engine]]

---

#auto-lending #risk/tier-1 #risk/tier-2 #risk/tier-3
