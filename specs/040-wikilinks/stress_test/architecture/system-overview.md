# System Overview

#architecture #status/approved #priority/high

The Auto Loan Orchestration Platform (ALOP) is a cloud-native system that processes dealer-submitted auto loan applications through a fully automated decisioning pipeline.

## High-Level Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Dealership   │────▶│  API Gateway  │────▶│  Message     │
│  DMS / Portal │     │  (REST/gRPC)  │     │  Queue       │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                     ┌────────────────────────────┼────────────────────┐
                     │                            ▼                    │
              ┌──────┴──────┐  ┌─────────────────────┐  ┌────────────┴───┐
              │ Transaction │  │ Adjudication Engine  │  │ Decision       │
              │ Intake      │  │ (Business Rules)     │  │ Dispatcher     │
              └─────────────┘  └──────────┬──────────┘  └────────────────┘
                                          │
                                ┌─────────┴─────────┐
                                │  Equifax Bureau    │
                                │  Integration       │
                                └────────────────────┘
```

## Core Components

### Ingress Layer
The [[architecture/api-gateway]] receives deal submissions from the [[dealership/dealer-network|dealer network]] via REST or gRPC. Submissions are validated against the [[dealership/dealer-submission-format|submission schema]] and placed on the [[architecture/message-queue|Kafka message queue]].

### Processing Layer
The [[workflow/loan-orchestration|orchestration engine]] coordinates the full lifecycle:

1. **Intake** — [[workflow/transaction-intake]] validates and enriches the application
2. **Bureau Pull** — [[equifax/equifax-integration|Equifax integration]] retrieves the applicant's credit file
3. **Adjudication** — [[workflow/adjudication-engine]] applies [[credit-policy/credit-policy-overview|credit policy rules]]
4. **Decision** — The engine issues an [[decisions/approval-workflow|approval]], [[decisions/counter-offer|counter-offer]], or [[decisions/decline-reasons|decline]]

### Egress Layer
Decisions flow back through the [[architecture/api-gateway]] to the dealer. The [[decisions/document-generation|document generation]] service produces closing packages for approved deals.

## Infrastructure

| Component | Technology |
|-----------|-----------|
| API Gateway | Kong / AWS API Gateway |
| Message Queue | Apache Kafka |
| Rules Engine | Drools / custom DSL |
| Bureau Integration | SOAP/XML over HTTPS |
| Database | PostgreSQL + Redis cache |
| Service Mesh | [[architecture/service-mesh]] *(planned)* |

## Cross-References

- See [[data/error-codes.txt]] for system error catalog
- See [[data/sample-transactions.csv]] for example deal payloads
- Compliance requirements: [[compliance/reg-b-checklist]] *(not yet documented)*

## Related

- [[architecture/api-gateway]]
- [[architecture/message-queue]]
- [[workflow/loan-orchestration]]

---

#integration/dealer-api #integration/equifax #orchestration
