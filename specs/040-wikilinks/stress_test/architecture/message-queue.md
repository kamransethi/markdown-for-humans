# Message Queue Architecture

#architecture #status/approved #priority/high

Apache Kafka serves as the asynchronous event backbone connecting all services in the [[architecture/system-overview|auto loan platform]].

## Topics

| Topic | Producer | Consumer | Purpose |
|-------|----------|----------|---------|
| `loan.applications.inbound` | [[architecture/api-gateway]] | [[workflow/transaction-intake]] | Raw deal submissions |
| `loan.applications.enriched` | [[workflow/transaction-intake]] | [[workflow/adjudication-engine]] | Validated & enriched apps |
| `loan.bureau.requests` | [[workflow/adjudication-engine]] | [[equifax/equifax-integration]] | Bureau pull requests |
| `loan.bureau.responses` | [[equifax/equifax-integration]] | [[workflow/adjudication-engine]] | Bureau data responses |
| `loan.decisions.outbound` | [[workflow/adjudication-engine]] | [[decisions/approval-workflow]], [[decisions/counter-offer]], [[decisions/decline-reasons]] | Final decisions |
| `loan.documents.generate` | Decision services | [[decisions/document-generation]] | Doc generation triggers |
| `loan.audit.events` | All services | [[compliance/audit-logger]] | Compliance audit trail |

> **Note:** The `loan.audit.events` topic consumer [[compliance/audit-logger]] is a planned but not-yet-implemented service. This is an intentionally broken wikilink.

## Consumer Groups

Each microservice runs as a Kafka consumer group with configurable parallelism. The [[workflow/adjudication-engine|adjudication engine]] typically runs 8 partitions to handle peak volume during dealer business hours (9 AM – 6 PM ET).

## Dead Letter Queue

Failed messages are routed to `loan.dlq.*` topics. The DLQ consumer applies the retry policy defined in [[workflow/loan-orchestration#error-handling]]:

- **Retryable errors** (e.g., `ERR-2001` bureau timeout): exponential backoff, max 3 retries
- **Non-retryable errors** (e.g., `ERR-1001` missing SSN): route to manual review queue

See [[data/error-codes.txt]] for the full error classification.

## Monitoring

Kafka lag monitoring triggers alerts when consumer lag exceeds 500 messages on any topic. The [[architecture/service-mesh|service mesh]] *(planned)* will add distributed tracing via OpenTelemetry.

## Embedded: Rate Sheet

For reference, the current rate tiers that drive decisioning:

![[data/rate-sheet-2024-q4.csv]]

---

#integration/dealer-api #integration/equifax #workflow/intake #workflow/adjudication
