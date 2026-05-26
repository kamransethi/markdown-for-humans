# Counter-Offer Logic

#workflow/decision #status/approved #priority/high

A counter-offer is issued when the [[workflow/adjudication-engine|adjudication engine]] finds that an application **fails one or more policy rules marginally** but can be restructured to comply.

## When Counter-Offers Are Generated


| Condition             | Trigger                                                              | Adjustment Strategy          |
| --------------------- | -------------------------------------------------------------------- | ---------------------------- |
| DTI slightly over max | DTI exceeds [[credit-policy/dti-rules|tier max]] by ≤ 5 points       | Extend term or reduce amount |
| LTV slightly over max | LTV exceeds [[credit-policy/ltv-guidelines|tier max]] by ≤ 15 points | Increase down payment        |
| Term not available    | Requested term N/A for tier (per [[data/rate-sheet-2024-q4.csv]])    | Offer shorter available term |
| Rate too low          | Requested rate below tier floor                                      | Offer tier-appropriate rate  |


Counter-offers are **not** generated when:

- Credit score is below 500 (auto decline per [[credit-policy/tier-matrix#deep-subprime]])
- DTI exceeds tier max by &gt; 5 points (too far gone — [[decisions/decline-reasons|decline]])
- Dealer is SUSPENDED or INACTIVE (see [[data/dealer-codes.txt]], [[data/error-codes.txt]] `ERR-4001`)

## Counter-Offer Generation Algorithm

```
1. Start with original application terms
2. For each failing rule:
   a. DTI_EXCEEDS → try longer term (reduces payment)
      - If longest available term still fails → try reducing amount
   b. LTV_EXCEEDS → calculate required down payment increase
   c. TERM_NOT_AVAILABLE → substitute longest available term
   d. RATE_BELOW_FLOOR → substitute tier floor rate
3. Re-evaluate all rules with adjusted terms
4. If all pass → issue counter-offer
5. If still failing → issue decline
```

## Counter-Offer Response

The counter-offer payload sent back through the [[architecture/api-gateway|API]] to the [[dealership/dealer-network|dealer]] includes:


| Field                 | Original  | Counter-Offer |
| --------------------- | --------- | ------------- |
| Term                  | 84 months | 60 months     |
| Rate                  | 5.49%     | 9.49%         |
| Amount                | $28,900   | $24,500       |
| Monthly Payment       | $412      | $510          |
| Required Down Payment | $0        | $4,400        |


## Dealer Response

The dealer has **7 business days** to respond to a counter-offer:


| Response        | Action                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------- |
| **Accept**      | Deal moves to [[decisions/approval-workflow]] with counter-offer terms                       |
| **Decline**     | Deal closed, [[decisions/decline-reasons#adverse-action-notices|adverse action letter]] sent |
| **No response** | Auto-expires, deal closed                                                                    |


## Worked Example

Deal `TXN-20241001-002` from [[data/sample-transactions.csv]]:

- **Applicant:** Marcus Johnson
- **Score:** 658 → [[credit-policy/tier-matrix#subprime\|Subprime]]
- **Original terms:** $28,900 / 60 months / 6.99%
- **DTI:** 41.7% — exceeds Subprime max of 38% by 3.7 points ✅ (within 5-point tolerance)
- **LTV:** 105.3% — exceeds Subprime max of 95% by 10.3 points ✅ (within 15-point tolerance)

**Counter-offer generated:**

- Reduce amount to $25,500 (LTV → 93.2%)
- Extend to 72 months (DTI → 37.1%)
- Rate: 12.49% (Subprime 72-month rate from [[data/rate-sheet-2024-q4.csv]])

## Related

- [[decisions/approval-workflow]]
- [[decisions/decline-reasons]]
- [[decisions/document-generation]]
- [[workflow/adjudication-engine]]
- [[credit-policy/dti-rules]]
- [[credit-policy/ltv-guidelines]]
- [[workflow/stipulation-checklist]]

#auto-lending #credit-policy #workflow/adjudication