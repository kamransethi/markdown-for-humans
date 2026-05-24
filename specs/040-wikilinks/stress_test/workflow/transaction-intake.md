# Transaction Intake

#workflow/intake #status/approved #priority/high

The Transaction Intake service is the first processing stage after the [[architecture/api-gateway|API Gateway]] receives a deal from the [[dealership/dealer-network|dealer network]].

## Responsibilities

1. **Schema Validation** — Verify the payload matches the [[dealership/dealer-submission-format|submission format]] (JSON or XML)
2. **Dealer Verification** — Confirm the dealer code exists in [[data/dealer-codes.txt]] and is `ACTIVE`
3. **Data Enrichment** — Append dealer metadata (tier, region, onboarding date)
4. **Deduplication** — Check for duplicate submissions within a 24-hour window
5. **Routing** — Publish enriched application to [[architecture/message-queue|Kafka]] topic `loan.applications.enriched`

## Validation Rules

| Field | Rule | Error Code |
|-------|------|-----------|
| `applicant.ssn` | Required, 9 digits | `ERR-1001`, `ERR-1002` |
| `applicant.dob` | Required, ISO 8601 | `ERR-1003` |
| `vehicle.vin` | 17 chars, valid check digit | `ERR-1004` |
| `loan.amount` | > $5,000, < $150,000 | `ERR-1005` |
| `loan.term` | 36, 48, 60, 72, or 84 months | `ERR-1006` |

All error codes reference [[data/error-codes.txt]].

> **Note:** Error codes `ERR-1004`, `ERR-1005`, and `ERR-1006` are referenced here but not yet defined in the error codes file. This tests broken cross-references to non-md files.

## Flat-File Support

For legacy dealers still using SFTP-based [[dealership/flat-file-import|flat-file imports]], the intake service includes a batch adapter that converts fixed-width records to the standard JSON format before applying the same validation pipeline.

## Monitoring

- Intake volume is tracked per dealer per hour
- Validation failure rate > 10% triggers a dealer notification
- See [[workflow/loan-orchestration#performance-sla|orchestration SLA]] for latency targets

## Next Step

After successful intake, the application proceeds to [[equifax/equifax-integration|bureau pull]] and then [[workflow/adjudication-engine|adjudication]].

---

#integration/dealer-api #compliance/fcra
