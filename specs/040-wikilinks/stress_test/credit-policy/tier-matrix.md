# Risk Tier Matrix

#credit-policy #status/approved #priority/high

The tier matrix assigns every applicant to a risk tier based on their FICO score from [[equifax/credit-score-mapping|Equifax bureau data]]. Tier assignment drives all downstream [[workflow/adjudication-engine|adjudication]] rules.

## Super Prime

**Score Range:** 780 – 850

| Parameter | Value |
|-----------|-------|
| Max DTI | 45% (see [[credit-policy/dti-rules#super-prime]]) |
| Max LTV | 110% (see [[credit-policy/ltv-guidelines#super-prime]]) |
| Available Terms | 36, 48, 60, 72, 84 months |
| Rate Range | 3.49% – 4.79% |

Super Prime applicants qualify for all products and receive the best pricing from [[data/rate-sheet-2024-q4.csv]].

## Prime

**Score Range:** 720 – 779

| Parameter | Value |
|-----------|-------|
| Max DTI | 45% (see [[credit-policy/dti-rules#prime]]) |
| Max LTV | 105% (see [[credit-policy/ltv-guidelines#prime]]) |
| Available Terms | 36, 48, 60, 72, 84 months |
| Rate Range | 4.49% – 6.49% |

## Near Prime

**Score Range:** 660 – 719

| Parameter | Value |
|-----------|-------|
| Max DTI | 42% (see [[credit-policy/dti-rules#near-prime]]) |
| Max LTV | 100% (see [[credit-policy/ltv-guidelines#near-prime]]) |
| Available Terms | 36, 48, 60, 72, 84 months |
| Rate Range | 6.49% – 9.49% |

Near Prime is the most common tier for [[decisions/counter-offer|counter-offers]], where a shorter term or larger down payment brings the deal into policy.

## Subprime

**Score Range:** 600 – 659

| Parameter | Value |
|-----------|-------|
| Max DTI | 38% (see [[credit-policy/dti-rules#subprime]]) |
| Max LTV | 95% (see [[credit-policy/ltv-guidelines#subprime]]) |
| Available Terms | 36, 48, 60, 72 months |
| Rate Range | 8.99% – 12.49% |

84-month terms are **not available** for Subprime. Requesting one returns `ERR-3003` (see [[data/error-codes.txt]]).

## Deep Subprime

**Score Range:** 500 – 599

| Parameter | Value |
|-----------|-------|
| Max DTI | 35% (see [[credit-policy/dti-rules#deep-subprime]]) |
| Max LTV | 85% (see [[credit-policy/ltv-guidelines#deep-subprime]]) |
| Available Terms | 36, 48, 60 months |
| Rate Range | 12.99% – 16.99% |

72-month and 84-month terms are **not available**. A co-signer may be required per [[workflow/stipulation-checklist]].

## Below Minimum (Score < 500)

Applications with a FICO score below 500 are **automatically declined**. See [[decisions/decline-reasons#minimum-credit-score]] for the adverse action notice.

## Platinum Tier

> ⚠️ A **Platinum** tier (score 850+) was discussed in Q3 planning but was **not approved**. This heading exists to test a broken anchor link: [[credit-policy/tier-matrix#platinum]] will resolve to this file but the heading content is just this notice.

## Score Source

Scores are sourced exclusively from [[equifax/equifax-integration|Equifax]]. The mapping from raw bureau scores to FICO is documented in [[equifax/credit-score-mapping]]. If Equifax is unavailable, the platform does **not** fall back to [[equifax/transunion-fallback]] *(this link is intentionally broken — TransUnion is not integrated)*.

## Embedded: Full Rate Sheet

![[data/rate-sheet-2024-q4.csv]]

---

#risk/tier-1 #risk/tier-2 #risk/tier-3 #auto-lending
