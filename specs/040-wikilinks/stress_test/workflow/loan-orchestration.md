# Loan Orchestration Flow

#workflow/intake #workflow/adjudication #workflow/decision #workflow/fulfillment #status/approved #priority/high

The loan orchestration engine coordinates the end-to-end lifecycle of an auto loan application — from [[workflow/transaction-intake|dealer submission]] to [[decisions/document-generation|document generation]].

## Orchestration Sequence

```
Dealer ──▶ API Gateway ──▶ Transaction Intake ──▶ Equifax Bureau Pull
                                                        │
                                                        ▼
              Document Gen ◀── Decision Dispatch ◀── Adjudication Engine
```

### Step 1: Intake
The [[workflow/transaction-intake]] service:
- Validates the payload against the [[dealership/dealer-submission-format|submission schema]]
- Enriches with dealer metadata from [[data/dealer-codes.txt]]
- Publishes to `loan.applications.enriched` on the [[architecture/message-queue|Kafka backbone]]

### Step 2: Bureau Pull
The [[equifax/equifax-integration|Equifax integration]] performs a [[equifax/soft-pull-vs-hard-pull|hard pull]] and returns:
- FICO score (mapped via [[equifax/credit-score-mapping]])
- Trade lines, inquiries, public records
- Fraud/freeze alerts

### Step 3: Adjudication
The [[workflow/adjudication-engine]] applies the full [[credit-policy/credit-policy-overview|credit policy]]:
- [[credit-policy/tier-matrix#super-prime|Tier assignment]] based on credit score
- [[credit-policy/dti-rules|DTI validation]] against policy maximums
- [[credit-policy/ltv-guidelines|LTV check]] against collateral value
- Rate lookup from [[data/rate-sheet-2024-q4.csv]]

### Step 4: Decision
Based on adjudication results, one of three paths:

| Outcome | Handler | Criteria |
|---------|---------|----------|
| ✅ Approved | [[decisions/approval-workflow]] | All policy rules pass |
| 🔄 Counter-Offer | [[decisions/counter-offer]] | Marginal fail — adjustable terms |
| ❌ Declined | [[decisions/decline-reasons]] | Hard policy fail |

### Step 5: Fulfillment
Approved deals trigger:
- [[decisions/document-generation|Document package]] creation
- [[workflow/stipulation-checklist|Stipulation tracking]]
- Funding queue entry

## Error Handling

When any step fails, the [[architecture/message-queue#dead-letter-queue|DLQ]] captures the failed message. Error codes from [[data/error-codes.txt]] determine retry eligibility.

| Error Class | Action |
|-------------|--------|
| `ERR-1xxx` (validation) | Return to dealer for correction |
| `ERR-2xxx` (bureau) | Retry with exponential backoff |
| `ERR-3xxx` (policy) | Issue decline via [[decisions/decline-reasons]] |
| `ERR-4xxx` (dealer) | Block submission, notify dealer ops |

## Risk Scoring

> ⚠️ The [[workflow/risk-scoring]] module is planned for Phase 2 but has not been implemented. This link is intentionally broken.

## Performance SLA

| Metric | Target |
|--------|--------|
| End-to-end latency (P95) | < 8 seconds |
| Bureau pull (P95) | < 3 seconds |
| Adjudication (P95) | < 500ms |
| Daily throughput | 50,000 applications |

## Sample Data

For a worked example of 10 deals flowing through the pipeline, see [[data/sample-transactions.csv]].

---

#auto-lending #orchestration #compliance/tila
