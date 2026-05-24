# Loan-to-Value (LTV) Guidelines

#credit-policy #status/approved #priority/high

LTV measures the ratio of the requested loan amount to the vehicle's assessed value. It is a key risk control in the [[workflow/adjudication-engine|adjudication engine]] alongside [[credit-policy/dti-rules|DTI]].

## Calculation

```
LTV = (loan_amount / vehicle_retail_value) × 100
```

- **`loan_amount`** includes the financed amount after any dealer add-ons (warranty, GAP, etc.)
- **`vehicle_retail_value`** is sourced from NADA or KBB valuations submitted in the [[dealership/dealer-submission-format|deal submission]]

## Maximum LTV by Tier

| Tier | Max LTV | GAP Required Above |
|------|---------|-------------------|
| [[credit-policy/tier-matrix#super-prime\|Super Prime]] | 110% | 100% |
| [[credit-policy/tier-matrix#prime\|Prime]] | 105% | 100% |
| [[credit-policy/tier-matrix#near-prime\|Near Prime]] | 100% | N/A — cannot exceed 100% |
| [[credit-policy/tier-matrix#subprime\|Subprime]] | 95% | N/A |
| [[credit-policy/tier-matrix#deep-subprime\|Deep Subprime]] | 85% | N/A |

## Super Prime

LTV up to **110%** is permitted for Super Prime applicants (FICO 780+). This allows dealer add-ons (extended warranty, paint protection) to be financed.

## Prime

Prime applicants (FICO 720–779) may go up to **105% LTV**. The 5-point reduction from Super Prime reflects moderately higher loss-given-default at this tier.

## Near Prime

Near Prime applicants (FICO 660–719) are capped at **100% LTV** — the loan may not exceed the vehicle's value. No dealer add-on financing is permitted above value.

## Subprime

Subprime applicants (FICO 600–659) are limited to **95% LTV**, requiring a minimum 5% down payment relative to vehicle value.

## Deep Subprime

Deep Subprime applicants (FICO 500–599) must maintain **85% LTV**, requiring a substantial 15% equity position. This protects the lender against rapid depreciation.

## GAP Insurance

For Super Prime and Prime deals with LTV above 100%, Guaranteed Asset Protection (GAP) insurance is **required** as a [[workflow/stipulation-checklist|stipulation]]. GAP covers the difference between the loan balance and insurance payout in the event of a total loss.

## Counter-Offer for High LTV

When LTV exceeds the tier maximum, the [[workflow/adjudication-engine]] attempts a [[decisions/counter-offer]]:

1. **Reduce loan amount** → dealer reduces price or applicant increases down payment
2. **Remove financed add-ons** → warranty, GAP purchased separately

If LTV still exceeds the max after counter-offer adjustments, the deal is [[decisions/decline-reasons|declined]] with `ERR-3002` (see [[data/error-codes.txt]]).

## Negative Equity / Trade-In

When the applicant has a trade-in with negative equity (owed > value), the negative equity is added to the new loan amount for LTV calculation. This frequently pushes Subprime and Deep Subprime applicants over the LTV cap.

See [[data/sample-transactions.csv]] for examples — deal `TXN-20241001-004` has 118.6% LTV on a Subprime applicant (max 95%), resulting in a decline.

## Related

- [[credit-policy/credit-policy-overview]]
- [[credit-policy/tier-matrix]]
- [[credit-policy/dti-rules]]
- [[workflow/adjudication-engine]]
- [[workflow/stipulation-checklist]]
- [[decisions/counter-offer]]

---

#auto-lending #risk/tier-1 #risk/tier-2 #risk/tier-3
