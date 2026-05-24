# Credit Score Mapping

#integration/equifax #credit-policy #status/approved #priority/medium

The [[equifax/equifax-integration|Equifax bureau pull]] returns a raw FICO score which must be mapped to the platform's risk tiers for [[workflow/adjudication-engine|adjudication]].

## Score Bands

| FICO Range | Risk Tier | Tier Reference |
|-----------|-----------|----------------|
| 780 – 850 | Super Prime | [[credit-policy/tier-matrix#super-prime]] |
| 720 – 779 | Prime | [[credit-policy/tier-matrix#prime]] |
| 660 – 719 | Near Prime | [[credit-policy/tier-matrix#near-prime]] |
| 600 – 659 | Subprime | [[credit-policy/tier-matrix#subprime]] |
| 500 – 599 | Deep Subprime | [[credit-policy/tier-matrix#deep-subprime]] |
| < 500 | Auto Decline | [[decisions/decline-reasons#minimum-credit-score]] |

## Score Versions

Equifax may return different FICO model versions. The platform normalizes to **FICO Auto Score 9**:

| Model | Usage | Adjustment |
|-------|-------|-----------|
| FICO Auto 9 | Standard | None (native) |
| FICO Auto 8 | Legacy | +5 to +15 points |
| FICO 8 (general) | Rare | -10 to -20 points |
| VantageScore 3.0 | Not accepted | Reject, request FICO |

## Multiple Scores

When the bureau returns multiple scores (e.g., from different models), the platform uses the **median** score for tier assignment. If only two scores are returned, the **lower** score is used.

## No-Score Applicants

Applicants with no FICO score ("thin file" — fewer than 3 trade lines or < 6 months history) cannot be auto-decisioned. These applications are routed to manual underwriting.

Error code `ERR-2002` (see [[data/error-codes.txt]]) is returned to the [[workflow/adjudication-engine]].

## Score Distribution (Q3 2024)

Based on [[data/sample-transactions.csv|recent transaction data]], the score distribution of applicants is approximately:

| Tier | % of Applications | Approval Rate |
|------|------------------|---------------|
| Super Prime | 18% | 95% |
| Prime | 24% | 88% |
| Near Prime | 22% | 72% |
| Subprime | 19% | 45% |
| Deep Subprime | 12% | 15% |
| Auto Decline | 5% | 0% |

## Related

- [[equifax/equifax-integration]]
- [[equifax/soft-pull-vs-hard-pull]]
- [[credit-policy/tier-matrix]]
- [[credit-policy/credit-policy-overview]]
- [[workflow/adjudication-engine]]
- [[data/rate-sheet-2024-q4.csv]]

---

#auto-lending #risk/tier-1 #risk/tier-2 #risk/tier-3
