# Adjudication Engine

#workflow/adjudication #status/approved #priority/high

The Adjudication Engine is the core decisioning component. It consumes enriched applications from [[architecture/message-queue|Kafka]], applies the [[credit-policy/credit-policy-overview|credit policy]], and emits a decision.

## Decision Flow

```
Enriched Application
        │
        ▼
┌───────────────────┐
│ 1. Bureau Data    │◀── [[equifax/equifax-integration]]
│    Retrieval      │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ 2. Tier Assignment│◀── [[credit-policy/tier-matrix]]
│    (Credit Score)  │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ 3. DTI Check      │◀── [[credit-policy/dti-rules]]
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ 4. LTV Check      │◀── [[credit-policy/ltv-guidelines]]
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ 5. Rate & Term    │◀── [[data/rate-sheet-2024-q4.csv]]
│    Pricing        │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ 6. Decision       │──▶ APPROVE / COUNTER / DECLINE
│    Dispatch       │
└───────────────────┘
```

## Business Rules

The engine evaluates rules in strict order. A failure at any step can short-circuit to a [[decisions/decline-reasons|decline]].

### Rule 1: Bureau Availability
If [[equifax/equifax-integration|Equifax]] returns `ERR-2001` (timeout) or `ERR-2002` (no hit), the application cannot be decisioned. Route to manual review.

If the bureau reports a fraud alert (`ERR-2004`), route to the [[workflow/risk-scoring|risk scoring module]] for enhanced review. *(This module is not yet built — intentionally broken link.)*

### Rule 2: Credit Tier
Map the applicant's FICO score to a risk tier using [[credit-policy/tier-matrix]]:

- **[[credit-policy/tier-matrix#super-prime|Super Prime]]** (780+): best rates, highest LTV
- **[[credit-policy/tier-matrix#prime|Prime]]** (720–779): standard terms
- **[[credit-policy/tier-matrix#near-prime|Near Prime]]** (660–719): restricted terms
- **[[credit-policy/tier-matrix#subprime|Subprime]]** (600–659): limited availability
- **[[credit-policy/tier-matrix#deep-subprime|Deep Subprime]]** (<600): high decline rate

### Rule 3: Debt-to-Income
Apply [[credit-policy/dti-rules]] maximum thresholds per tier. If DTI exceeds the limit, evaluate whether a [[decisions/counter-offer|counter-offer]] (shorter term, lower amount) can bring DTI into compliance.

### Rule 4: Loan-to-Value
Apply [[credit-policy/ltv-guidelines]] caps. LTV above the tier maximum triggers a decline unless the applicant qualifies for a [[decisions/counter-offer|counter-offer with additional down payment]].

### Rule 5: Pricing
Look up the applicable rate from [[data/rate-sheet-2024-q4.csv]] based on tier and requested term. If the requested term is `N/A` for the tier (e.g., 84 months for Deep Subprime), return `ERR-3003`.

## Worked Example

Consider deal `TXN-20241001-002` from [[data/sample-transactions.csv]]:

| Field | Value | Rule | Result |
|-------|-------|------|--------|
| Credit Score | 658 | [[credit-policy/tier-matrix]] | Subprime |
| DTI | 41.7% | [[credit-policy/dti-rules]] | ❌ Exceeds 38% max |
| LTV | 105.3% | [[credit-policy/ltv-guidelines]] | ❌ Exceeds 95% max |
| Decision | — | — | Counter-offer (reduce amount, shorter term) |

## Future: ML Scoring

A machine-learning-based [[workflow/risk-scoring]] model will augment the rules engine. It is currently in development and **not yet linked** to the production pipeline.

## Related

- [[workflow/loan-orchestration]] — parent orchestration flow
- [[workflow/stipulation-checklist]] — post-approval steps
- [[decisions/approval-workflow]] — approved deal handler
- [[decisions/counter-offer]] — counter-offer logic
- [[decisions/decline-reasons]] — adverse action

---

#auto-lending #credit-policy #risk/tier-1 #risk/tier-2 #risk/tier-3 #compliance/ecoa
